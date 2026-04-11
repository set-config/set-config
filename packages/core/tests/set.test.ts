import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { set } from '../src/commands/set.js';
import fs from 'fs';
import path from 'path';

describe('set command', () => {
  const testDir = path.join(process.cwd(), 'test-temp-' + Date.now());
  const testFile = path.join(testDir, 'test.json');

  beforeEach(() => {
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  it('should set value in existing file', async () => {
    fs.writeFileSync(testFile, JSON.stringify({ existing: true }));
    const logs: string[] = [];
    const orig = console.log;
    console.log = (...args) => logs.push(args.join(' '));

    await set(testFile, 'foo', 'bar');

    console.log = orig;
    expect(fs.existsSync(testFile)).toBe(true);
    const content = JSON.parse(fs.readFileSync(testFile, 'utf-8'));
    expect(content.foo).toBe('bar');
    expect(content.existing).toBe(true);
    expect(logs.some(l => l.includes('✓ Set'))).toBe(true);
    expect(logs.some(l => l.includes('not found'))).toBe(false);
  });

  it('should create file and show message when file does not exist', async () => {
    expect(fs.existsSync(testFile)).toBe(false);
    const logs: string[] = [];
    const orig = console.log;
    console.log = (...args) => logs.push(args.join(' '));

    await set(testFile, 'foo', 'bar');

    console.log = orig;
    expect(fs.existsSync(testFile)).toBe(true);
    const content = JSON.parse(fs.readFileSync(testFile, 'utf-8'));
    expect(content.foo).toBe('bar');
    expect(logs.some(l => l.includes('○ File not found, created'))).toBe(true);
    expect(logs.some(l => l.includes('✓ Set'))).toBe(true);
  });

  it('should set nested value in non-existent file', async () => {
    expect(fs.existsSync(testFile)).toBe(false);
    const logs: string[] = [];
    const orig = console.log;
    console.log = (...args) => logs.push(args.join(' '));

    await set(testFile, 'a.b.c', 'deep value');

    console.log = orig;
    expect(fs.existsSync(testFile)).toBe(true);
    const content = JSON.parse(fs.readFileSync(testFile, 'utf-8'));
    expect(content.a.b.c).toBe('deep value');
    expect(logs.some(l => l.includes('○ File not found, created'))).toBe(true);
  });

  it('should overwrite existing value', async () => {
    fs.writeFileSync(testFile, JSON.stringify({ foo: 'old' }));
    const logs: string[] = [];
    const orig = console.log;
    console.log = (...args) => logs.push(args.join(' '));

    await set(testFile, 'foo', 'new');

    console.log = orig;
    const content = JSON.parse(fs.readFileSync(testFile, 'utf-8'));
    expect(content.foo).toBe('new');
    expect(logs.some(l => l.includes('○ File not found'))).toBe(false);
    expect(logs.some(l => l.includes('✓ Set'))).toBe(true);
  });

  it('should create parent directories when they do not exist', async () => {
    const nestedDir = path.join(testDir, 'deeply', 'nested', 'dir');
    const nestedFile = path.join(nestedDir, 'config.json');
    expect(fs.existsSync(nestedDir)).toBe(false);

    await set(nestedFile, 'foo', 'bar');

    expect(fs.existsSync(nestedFile)).toBe(true);
    const content = JSON.parse(fs.readFileSync(nestedFile, 'utf-8'));
    expect(content.foo).toBe('bar');
  });
});
