import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { set } from '../src/commands/set.js';
import { append } from '../src/commands/append.js';
import { merge } from '../src/commands/merge.js';
import fs from 'fs';
import path from 'path';

const testDir = path.join(process.cwd(), 'test-temp-commands-' + Date.now());

beforeEach(() => {
  fs.mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true });
  }
});

function writeJson(filename: string, data: unknown) {
  fs.writeFileSync(path.join(testDir, filename), JSON.stringify(data, null, 2) + '\n');
}

function readJson(filename: string): unknown {
  return JSON.parse(fs.readFileSync(path.join(testDir, filename), 'utf-8'));
}

describe('set --json', () => {
  it('should set value with strict JSON parse', async () => {
    writeJson('test.json', { existing: true });
    await set(path.join(testDir, 'test.json'), 'model', '"MiniMax-M2.7-highspeed"', true);
    const data = readJson('test.json') as any;
    expect(data.model).toBe('MiniMax-M2.7-highspeed');
    expect(data.existing).toBe(true);
  });

  it('should reject invalid JSON with --json', async () => {
    writeJson('test.json', {});
    await expect(
      set(path.join(testDir, 'test.json'), 'key', 'not-json', true)
    ).rejects.toThrow('Invalid JSON');
  });

  it('should replace entire file with empty path', async () => {
    writeJson('test.json', { old: true });
    await set(path.join(testDir, 'test.json'), '', '{"new":true}', true);
    const data = readJson('test.json') as any;
    expect(data).toEqual({ new: true });
  });

  it('should create file with empty path and --json', async () => {
    const file = path.join(testDir, 'new.json');
    await set(file, '', '{"created":true}', true);
    const data = readJson('new.json') as any;
    expect(data).toEqual({ created: true });
  });
});

describe('append --json', () => {
  it('should append object to existing array', async () => {
    writeJson('test.json', { items: [{ name: 'a' }] });
    await append(path.join(testDir, 'test.json'), 'items', '{"name":"b"}', true);
    const data = readJson('test.json') as any;
    expect(data.items).toEqual([{ name: 'a' }, { name: 'b' }]);
  });

  it('should skip if identical object already exists (idempotent)', async () => {
    writeJson('test.json', { items: [{ name: 'a', x: 1 }] });
    await append(path.join(testDir, 'test.json'), 'items', '{"name":"a","x":1}', true);
    const data = readJson('test.json') as any;
    expect(data.items).toEqual([{ name: 'a', x: 1 }]);
  });

  it('should reject when path does not exist', async () => {
    writeJson('test.json', {});
    await expect(
      append(path.join(testDir, 'test.json'), 'missing', '{"name":"x"}', true)
    ).rejects.toThrow('Path not found');
  });

  it('should reject when path is not an array', async () => {
    writeJson('test.json', { items: 'not-array' });
    await expect(
      append(path.join(testDir, 'test.json'), 'items', '{"name":"x"}', true)
    ).rejects.toThrow('not an array');
  });

  it('should reject non-object values', async () => {
    writeJson('test.json', { items: [] });
    await expect(
      append(path.join(testDir, 'test.json'), 'items', '"string"', true)
    ).rejects.toThrow('requires a JSON object');
  });

  it('should reject empty path', async () => {
    writeJson('test.json', {});
    await expect(
      append(path.join(testDir, 'test.json'), '', '{"name":"x"}', true)
    ).rejects.toThrow('requires a path');
  });
});

describe('merge', () => {
  it('should deep merge into root object', async () => {
    writeJson('test.json', { a: 1, b: { c: 2 } });
    await merge(path.join(testDir, 'test.json'), undefined, '{"b":{"d":3},"e":4}');
    const data = readJson('test.json') as any;
    expect(data.a).toBe(1);
    expect(data.b).toEqual({ c: 2, d: 3 });
    expect(data.e).toBe(4);
  });

  it('should deep merge into nested path', async () => {
    writeJson('test.json', { provider: { minimax: { limit: 100 }, other: true } });
    await merge(path.join(testDir, 'test.json'), 'provider.minimax', '{"limit":200,"new":true}');
    const data = readJson('test.json') as any;
    expect(data.provider.minimax).toEqual({ limit: 200, new: true });
    expect(data.provider.other).toBe(true);
  });

  it('should create file and intermediate paths', async () => {
    const file = path.join(testDir, 'new.json');
    await merge(file, undefined, '{"a":{"b":1}}');
    const data = readJson('new.json') as any;
    expect(data).toEqual({ a: { b: 1 } });
  });

  it('should create nested path when not exists', async () => {
    writeJson('test.json', { existing: true });
    await merge(path.join(testDir, 'test.json'), 'new.path', '{"x":1}');
    const data = readJson('test.json') as any;
    expect(data.existing).toBe(true);
    expect(data.new.path).toEqual({ x: 1 });
  });

  it('should replace leaf node with object then merge', async () => {
    writeJson('test.json', { config: 'old-string' });
    await merge(path.join(testDir, 'test.json'), 'config', '{"key":"value"}');
    const data = readJson('test.json') as any;
    expect(data.config).toEqual({ key: 'value' });
  });

  it('should replace arrays (not merge them)', async () => {
    writeJson('test.json', { models: [{ name: 'old' }] });
    await merge(path.join(testDir, 'test.json'), 'models', '[{"name":"new"}]');
    const data = readJson('test.json') as any;
    expect(data.models).toEqual([{ name: 'new' }]);
  });

  it('should support --json strict mode', async () => {
    writeJson('test.json', { a: 1 });
    await merge(path.join(testDir, 'test.json'), undefined, '{"b":2}', true);
    const data = readJson('test.json') as any;
    expect(data).toEqual({ a: 1, b: 2 });
  });

  it('should reject non-object values', async () => {
    writeJson('test.json', {});
    await expect(
      merge(path.join(testDir, 'test.json'), undefined, '"string"')
    ).rejects.toThrow('requires a JSON object');
  });

  it('should reject invalid JSON with --json', async () => {
    writeJson('test.json', {});
    await expect(
      merge(path.join(testDir, 'test.json'), undefined, 'not-json', true)
    ).rejects.toThrow('Invalid JSON');
  });

  it('should work with empty string path (explicit)', async () => {
    writeJson('test.json', { a: 1 });
    await merge(path.join(testDir, 'test.json'), '', '{"b":2}');
    const data = readJson('test.json') as any;
    expect(data).toEqual({ a: 1, b: 2 });
  });
});
