import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const testDir = path.join(process.cwd(), 'test-temp-lock-' + Date.now());
const testFile = path.join(testDir, 'config.json');
const workerFile = path.join(testDir, '_worker.cjs');

beforeEach(() => {
  fs.mkdirSync(testDir, { recursive: true });
  fs.writeFileSync(testFile, JSON.stringify({ base: true }, null, 2) + '\n');

  // Worker script with lockFile inlined (avoids cross-process .ts import issues)
  fs.writeFileSync(workerFile, `
const fs = require('fs');
function pidAlive(pid) { try { process.kill(pid, 0); return true; } catch { return false; } }
function readPid(p) { try { return parseInt(fs.readFileSync(p, 'utf8').trim(), 10) || null; } catch { return null; } }
function lockFile(target, timeoutMs) {
  timeoutMs = timeoutMs || 5000;
  const lp = target + '.set-config.lock';
  const t0 = Date.now(); let fd = null;
  while (true) {
    try { fd = fs.openSync(lp, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY, 0o600); fs.writeSync(fd, String(process.pid)); break; }
    catch (e) { if (e.code !== 'EEXIST') throw e; }
    const pid = readPid(lp);
    if (pid === null || !pidAlive(pid)) { try { fs.unlinkSync(lp); } catch {} continue; }
    if (Date.now() - t0 >= timeoutMs) throw new Error('Lock timeout');
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
  }
  let released = false;
  return () => { if (released) return; released = true; try { fs.closeSync(fd); } catch {} try { fs.unlinkSync(lp); } catch {} };
}
const target = process.argv[2], key = process.argv[3], value = process.argv[4];
const unlock = lockFile(target);
try {
  let data = {};
  try { const raw = fs.readFileSync(target, 'utf8'); if (raw.trim()) data = JSON.parse(raw); } catch {}
  data[key] = value;
  fs.writeFileSync(target, JSON.stringify(data, null, 2) + '\\n');
} finally { unlock(); }
`);
});

afterEach(() => {
  if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
});

function spawnWorker(key: string, value: string): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [workerFile, testFile, key, value], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr?.on('data', (c: Buffer) => { stderr += c.toString(); });
    child.on('exit', (code) => resolve({ code: code ?? 1, stderr }));
    child.on('error', reject);
  });
}

describe('file-lock', () => {
  it('acquire and release — lock file created then removed', async () => {
    const { lockFile } = await import('../src/file-lock.js');
    const unlock = lockFile(testFile);
    const lp = testFile + '.set-config.lock';

    expect(fs.existsSync(lp)).toBe(true);
    expect(fs.readFileSync(lp, 'utf8').trim()).toBe(String(process.pid));

    unlock();
    expect(fs.existsSync(lp)).toBe(false);
  });

  it('serialize 5 concurrent writers — no data loss', async () => {
    const N = 5;
    const results = await Promise.all(
      Array.from({ length: N }, (_, i) => spawnWorker(`key${i}`, `value${i}`)),
    );

    for (const r of results) {
      if (r.code !== 0) console.error('Worker stderr:', r.stderr);
      expect(r.code).toBe(0);
    }

    const final = JSON.parse(fs.readFileSync(testFile, 'utf8'));
    expect(final.base).toBe(true);
    for (let i = 0; i < N; i++) expect(final[`key${i}`]).toBe(`value${i}`);
  });

  it('timeout when lock is held', async () => {
    const { lockFile } = await import('../src/file-lock.js');
    const unlock = lockFile(testFile, 60_000);

    try {
      const { lockFile: lf2 } = await import('../src/file-lock.js');
      expect(() => lf2(testFile, 100)).toThrow(/Lock timeout/);
    } finally {
      unlock();
    }
  });

  it('steals stale lock when owner pid is dead', async () => {
    const lp = testFile + '.set-config.lock';
    fs.writeFileSync(lp, '999999999');

    const { lockFile } = await import('../src/file-lock.js');
    const unlock = lockFile(testFile);

    expect(fs.readFileSync(lp, 'utf8').trim()).toBe(String(process.pid));
    unlock();
  });

  it('works when target file does not exist', async () => {
    const nonExistent = path.join(testDir, 'new-config.json');
    const { lockFile } = await import('../src/file-lock.js');
    const unlock = lockFile(nonExistent);

    expect(fs.existsSync(nonExistent + '.set-config.lock')).toBe(true);
    unlock();
    expect(fs.existsSync(nonExistent + '.set-config.lock')).toBe(false);
  });
});
