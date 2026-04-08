/**
 * Integration tests for published npm packages
 * 
 * Run with: CI=true pnpm test:integration
 * 
 * Note: These tests are SKIPPED by default.
 * They require: CI=true AND network access to npm registry.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';

const REGISTRY = '--registry https://registry.npmjs.org/';

// Check network access
const hasNetwork = (() => {
  try {
    execSync('curl -s --max-time 5 https://registry.npmjs.org > /dev/null', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

const skipIfNoNetwork = it.skipIf(!hasNetwork || process.env.CI !== 'true');

let tmpDir: string;
beforeEach(() => { tmpDir = mkdtempSync(join('/tmp', 'set-config-test-')); });
afterEach(() => { try { rmSync(tmpDir, { recursive: true, force: true }); } catch {} });

function npx(pkg: string, args: string): string {
  const version = execSync(`npm view ${pkg} version ${REGISTRY}`, { encoding: 'utf-8', timeout: 30000 }).trim();
  return execSync(`npx -p ${pkg}@${version} ${REGISTRY} ${args}`, { cwd: tmpDir, encoding: 'utf-8', stdio: 'pipe', timeout: 60000 });
}

// NOTE: @set-config/core does NOT expose CLI - it's just the engine

describe('npx @set-config/yaml', () => {
  skipIfNoNetwork('set/get YAML', () => {
    npx('@set-config/yaml', 'set-config set test.yaml a 123');
    expect(npx('@set-config/yaml', 'set-config get test.yaml a')).toContain('123');
  });
});

describe('npx @set-config/toml', () => {
  skipIfNoNetwork('set/get TOML', () => {
    npx('@set-config/toml', 'set-config set test.toml b 456');
    expect(npx('@set-config/toml', 'set-config get test.toml b')).toContain('456');
  });
});

describe('npx @set-config/cli', () => {
  skipIfNoNetwork('formats shows all adapters', () => {
    const formats = npx('@set-config/cli', 'set-config formats');
    expect(formats).toContain('JSON');
    expect(formats).toContain('YAML');
    expect(formats).toContain('TOML');
  });
});
