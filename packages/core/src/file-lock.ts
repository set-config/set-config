import fs from 'fs';

// Advisory lock: O_EXCL acquire, PID stale detect, unlink on release.
// Waiters always go through O_EXCL first — "no lock file" just means O_EXCL succeeds.
// No file is ever left behind.

const POLL_MS = 50;

function warn(tag: string, err: unknown) {
  process.stderr.write(`[set-config:lock:${tag}] ${err instanceof Error ? err.message : err}\n`);
}

function pidAlive(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function readPid(p: string): number | null {
  try {
    const n = parseInt(fs.readFileSync(p, 'utf8').trim(), 10);
    return Number.isNaN(n) ? null : n;
  } catch { return null; }
}

export function lockFile(target: string, timeoutMs = 30_000): () => void {
  const lp = target + '.set-config.lock';
  const t0 = Date.now();
  let fd: number | null = null;

  while (true) {
    try {
      fd = fs.openSync(lp, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY, 0o600);
      fs.writeSync(fd, String(process.pid));
      break;
    } catch (e: any) {
      if (e?.code !== 'EEXIST') throw e;
    }

    const pid = readPid(lp);
    if (pid === null || !pidAlive(pid)) {
      // Stale — steal
      try { fs.unlinkSync(lp); } catch (e) { warn('steal', e); }
      continue;
    }

    if (Date.now() - t0 >= timeoutMs)
      throw new Error(`Lock timeout (${timeoutMs}ms) for ${target}, held by PID ${pid}`);

    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, POLL_MS);
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    try { fs.closeSync(fd!); } catch (e) { warn('close', e); }
    try { fs.unlinkSync(lp); } catch (e) { warn('unlink', e); }
  };
}
