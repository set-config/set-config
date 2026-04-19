import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EnvAdapter } from '../src/index.js';
import fs from 'fs';
import path from 'path';

const testDir = path.join(process.cwd(), 'test-temp-env-' + Date.now());
const adapter = new EnvAdapter();

beforeEach(() => {
  fs.mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true });
  }
});

describe('EnvAdapter.supports', () => {
  it('should support .env files', () => {
    expect(adapter.supports('.env')).toBe(true);
    expect(adapter.supports('.env.local')).toBe(true);
    expect(adapter.supports('.env.production')).toBe(true);
    expect(adapter.supports('app.env')).toBe(true);
  });

  it('should not support other files', () => {
    expect(adapter.supports('config.json')).toBe(false);
    expect(adapter.supports('config.yaml')).toBe(false);
    expect(adapter.supports('env')).toBe(false);
  });
});

describe('EnvAdapter.read', () => {
  it('should read basic KEY=VALUE', () => {
    const f = path.join(testDir, '.env');
    fs.writeFileSync(f, 'FOO=bar\nBAZ=123\n');
    expect(adapter.read(f)).toEqual({ FOO: 'bar', BAZ: '123' });
  });

  it('should read quoted values', () => {
    const f = path.join(testDir, '.env');
    fs.writeFileSync(f, 'KEY="value with spaces"\nSINGLE=\'single quoted\'\n');
    expect(adapter.read(f)).toEqual({ KEY: 'value with spaces', SINGLE: 'single quoted' });
  });

  it('should read export prefix', () => {
    const f = path.join(testDir, '.env');
    fs.writeFileSync(f, 'export MY_VAR=hello\nNO_EXPORT=world\n');
    expect(adapter.read(f)).toEqual({ MY_VAR: 'hello', NO_EXPORT: 'world' });
  });

  it('should skip comments and empty lines', () => {
    const f = path.join(testDir, '.env');
    fs.writeFileSync(f, '# comment\n\nKEY=value\n');
    expect(adapter.read(f)).toEqual({ KEY: 'value' });
  });

  it('should return null for missing file', () => {
    expect(adapter.read('/nonexistent/.env')).toBeNull();
  });

  it('should return null for empty file', () => {
    const f = path.join(testDir, '.env');
    fs.writeFileSync(f, '');
    expect(adapter.read(f)).toBeNull();
  });

  it('should preserve value with equals sign', () => {
    const f = path.join(testDir, '.env');
    fs.writeFileSync(f, 'URL=https://example.com?foo=bar\n');
    expect(adapter.read(f)).toEqual({ URL: 'https://example.com?foo=bar' });
  });
});

describe('EnvAdapter.write', () => {
  it('should write KEY=VALUE pairs', () => {
    const f = path.join(testDir, '.env');
    adapter.write(f, { FOO: 'bar', BAZ: '123' });
    expect(fs.readFileSync(f, 'utf8')).toBe('FOO=bar\nBAZ=123\n');
  });

  it('should overwrite existing file', () => {
    const f = path.join(testDir, '.env');
    fs.writeFileSync(f, 'OLD=value\n');
    adapter.write(f, { NEW: 'data' });
    expect(fs.readFileSync(f, 'utf8')).toBe('NEW=data\n');
  });
});

describe('EnvAdapter roundtrip', () => {
  it('should survive read → modify → write → read', () => {
    const f = path.join(testDir, '.env');
    adapter.write(f, { A: '1', B: '2' });
    const data = adapter.read(f) as Record<string, string>;
    data.C = '3';
    data.A = 'updated';
    adapter.write(f, data);
    expect(adapter.read(f)).toEqual({ A: 'updated', B: '2', C: '3' });
  });
});
