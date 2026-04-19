import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  parseValue, parseValueStrict,
  setNested, mergeNested, deleteNested,
  appendNested, getNested, splitKV,
} from '../src/utils.js';

const testDir = path.join(process.cwd(), 'test-temp-batch-' + Date.now());

beforeEach(() => {
  fs.mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true });
  }
});

function readJson(filename: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(testDir, filename), 'utf-8'));
}

function writeJson(filename: string, data: unknown) {
  fs.writeFileSync(path.join(testDir, filename), JSON.stringify(data, null, 2) + '\n');
}

/**
 * Simulates batch mode logic: read once, apply all ops, write once.
 */
function batchRun(filename: string, ops: Array<{ type: string; kv: string }>) {
  const filepath = path.join(testDir, filename);
  const raw = fs.existsSync(filepath) ? fs.readFileSync(filepath, 'utf-8') : '';
  const data: Record<string, unknown> = raw.trim() ? JSON.parse(raw) : {};
  let changed = false;

  for (const op of ops) {
    const [p, v] = splitKV(op.kv);
    switch (op.type) {
      case 'set': {
        setNested(data, p, parseValue(v));
        changed = true;
        break;
      }
      case 'set-json': {
        setNested(data, p, parseValueStrict(v));
        changed = true;
        break;
      }
      case 'merge': {
        const parsed = parseValue(v);
        if (typeof parsed !== 'object' || parsed === null) throw new Error('--merge requires object');
        const result = mergeNested(data, p, parsed);
        if (!p && result !== data) Object.assign(data, result);
        changed = true;
        break;
      }
      case 'merge-json': {
        const parsed = parseValueStrict(v);
        if (typeof parsed !== 'object' || parsed === null) throw new Error('--merge-json requires object');
        const result = mergeNested(data, p, parsed);
        if (!p && result !== data) Object.assign(data, result);
        changed = true;
        break;
      }
      case 'append-json': {
        if (!p) throw new Error('--append-json requires path');
        const target = getNested(data, p);
        if (target === undefined) throw new Error(`Path not found: ${p}`);
        if (!Array.isArray(target)) throw new Error(`Not an array: ${p}`);
        const parsed = parseValueStrict(v);
        const exists = (target as unknown[]).some(item => JSON.stringify(item) === JSON.stringify(parsed));
        if (!exists) {
          (target as unknown[]).push(parsed);
          changed = true;
        }
        break;
      }
      case 'delete': {
        // --delete='path' — entire kv is the path, no value
        const delPath = p ? p : v; // if no '=', p is empty, v has the path
        if (deleteNested(data, delPath)) changed = true;
        break;
      }
    }
  }

  if (changed) {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n');
  }
}

describe('splitKV', () => {
  it('should split on first =', () => {
    expect(splitKV('a=1')).toEqual(['a', '1']);
    expect(splitKV('a.b.c=hello')).toEqual(['a.b.c', 'hello']);
  });

  it('should handle value with =', () => {
    expect(splitKV('url=https://example.com?a=1&b=2')).toEqual(['url', 'https://example.com?a=1&b=2']);
  });

  it('should return empty path when no =', () => {
    expect(splitKV('{"a":1}')).toEqual(['', '{"a":1}']);
  });
});

describe('batch mode logic', () => {
  it('should set multiple values', () => {
    batchRun('test.json', [
      { type: 'set', kv: 'a=1' },
      { type: 'set', kv: 'b=2' },
      { type: 'set', kv: 'c=hello' },
    ]);
    expect(readJson('test.json')).toEqual({ a: 1, b: 2, c: 'hello' });
  });

  it('should set-json for strict types', () => {
    batchRun('test.json', [
      { type: 'set-json', kv: 'model="gpt-4o"' },
    ]);
    expect(readJson('test.json')).toEqual({ model: 'gpt-4o' });
  });

  it('should merge-json for object values', () => {
    writeJson('test.json', { provider: { name: 'old', limit: 100 } });
    batchRun('test.json', [
      { type: 'merge-json', kv: 'provider={"limit":200,"new":true}' },
    ]);
    const data = readJson('test.json') as any;
    expect(data.provider.name).toBe('old');
    expect(data.provider.limit).toBe(200);
    expect(data.provider.new).toBe(true);
  });

  it('should merge-json into root (empty path)', () => {
    writeJson('test.json', { a: 1 });
    batchRun('test.json', [
      { type: 'merge-json', kv: '{"b":2,"c":3}' },
    ]);
    expect(readJson('test.json')).toEqual({ a: 1, b: 2, c: 3 });
  });

  it('should mix set + merge-json + delete', () => {
    writeJson('test.json', { old: true, keep: true });
    batchRun('test.json', [
      { type: 'set', kv: 'new=1' },
      { type: 'merge-json', kv: 'extra={"x":2}' },
      { type: 'delete', kv: 'old' },
    ]);
    expect(readJson('test.json')).toEqual({ keep: true, new: 1, extra: { x: 2 } });
  });

  it('should delete keys', () => {
    writeJson('test.json', { a: 1, b: 2, c: 3 });
    batchRun('test.json', [
      { type: 'delete', kv: 'b' },
    ]);
    expect(readJson('test.json')).toEqual({ a: 1, c: 3 });
  });

  it('should append-json to array (idempotent)', () => {
    writeJson('test.json', { items: [{ name: 'a' }] });
    batchRun('test.json', [
      { type: 'append-json', kv: 'items={"name":"b"}' },
      { type: 'append-json', kv: 'items={"name":"b"}' },
    ]);
    const data = readJson('test.json') as any;
    expect(data.items).toEqual([{ name: 'a' }, { name: 'b' }]);
  });

  it('should create file when not exists', () => {
    batchRun('new.json', [
      { type: 'set', kv: 'x=1' },
      { type: 'set', kv: 'y=2' },
    ]);
    expect(readJson('new.json')).toEqual({ x: 1, y: 2 });
  });

  it('should handle value with = in set', () => {
    batchRun('test.json', [
      { type: 'set', kv: 'url=https://example.com?a=1&b=2' },
    ]);
    const data = readJson('test.json') as any;
    expect(data.url).toBe('https://example.com?a=1&b=2');
  });

  it('should handle merge with heuristic parse', () => {
    writeJson('test.json', { a: { x: 1 } });
    batchRun('test.json', [
      { type: 'merge', kv: 'a={"y":2}' },
    ]);
    const data = readJson('test.json') as any;
    expect(data.a).toEqual({ x: 1, y: 2 });
  });
});
