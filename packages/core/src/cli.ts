#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { parseArgs } from 'util';
import {
  getAdapter, getSupportedFormats,
  parseValue, parseValueStrict,
  setNested, mergeNested, deleteNested,
  appendNested, getNested,
  resolvePath, splitKV,
} from './lib.js';
import { set } from './commands/set.js';
import { get } from './commands/get.js';
import { del } from './commands/delete.js';
import { list } from './commands/list.js';
import { append } from './commands/append.js';
import { remove } from './commands/remove.js';
import { merge } from './commands/merge.js';
import { init } from './commands/init.js';
import { lockFile } from './file-lock.js';

/**
 * Batch mode: read once, apply all ops, write once.
 */
async function showHelp() {
  const formats = await getSupportedFormats();
  console.log(`set-config - Config changes should be readable, not reverse-engineered.

Usage:
  set-config <file> --set='path=value' --merge='path={...}'   # Batch (recommended)
  set-config get <file> [path]                                  # Read value
  set-config init <file> [--format]                              # Create new file

Batch options (single read + multiple ops + single write):
  --set='path=value'            Set value (heuristic: numbers, bools, JSON)
  --set-json='path=json'        Set value (strict JSON.parse, fails on invalid)
  --merge='path=json'           Deep merge object at path
  --merge-json='path=json'      Deep merge object at path (strict JSON.parse)
  --append-json='path=json'     Append to array at path (strict, idempotent)
  --delete='path'               Delete key at path

Concurrency:
  --lock                        Acquire file lock before write. Concurrent
                                processes targeting the same file queue up
                                and execute one at a time. Default: off.
  --lock-timeout=<ms>           Max wait time for lock (default: 30000).

Rules:
  Split on first '=': left is path, right is value. Empty path = root.
  Operations execute in flag order. All ops share one read + one write.

Supported formats:
${formats.map(f => `  - ${f}`).join('\n')}

Examples:
  set-config config.json --set='model=gpt-4o' --set='debug=true'
  set-config config.yaml --set='gateway.mode=local' --set='gateway.auth.mode=token'
  set-config config.toml --set='model=llm-v1' --set='approval_policy=never' \\
    --merge='model_providers.default={"name":"Provider","base_url":"http://localhost:8000"}'
  set-config .env --set='API_KEY=sk-xxx' --set='BASE_URL=https://api.example.com'
  set-config config.json --set='model=gpt-4o' --merge='provider={"api_key":"sk-..."}' --delete='legacy'
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    await showHelp();
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    const { version } = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    console.log(`set-config v${version}`);
    process.exit(0);
  }

  const { values, positionals } = parseArgs({
    args,
    options: {
      format: { type: 'string', short: 'f' },
      json: { type: 'boolean', short: 'j' },
      lock: { type: 'boolean' },
      'lock-timeout': { type: 'string' },
      set: { type: 'string', multiple: true },
      'set-json': { type: 'string', multiple: true },
      merge: { type: 'string', multiple: true },
      'merge-json': { type: 'string', multiple: true },
      'append-json': { type: 'string', multiple: true },
      delete: { type: 'string', multiple: true },
    },
    allowPositionals: true,
    strict: false,
  });
  const v = values as any;
  const jsonMode = v.json === true;
  const [commandName, ...cmdArgs] = positionals;

  // ── Built-in commands (no file needed) ──

  if (commandName === 'formats') {
    const formats = await getSupportedFormats();
    formats.forEach(f => console.log(`  - ${f}`));
    return;
  }

  if (commandName === 'init') {
    const useLock = v.lock === true;
    const lockTimeout = v['lock-timeout'] ? parseInt(v['lock-timeout'] as string, 10) : undefined;
    const unlock = useLock && cmdArgs[0] ? lockFile(resolvePath(cmdArgs[0]), lockTimeout) : null;
    try { await init(cmdArgs[0], v.format as string | undefined); }
    finally { unlock?.(); }
    return;
  }

  // ── Batch mode: first positional is file, ops come from flags ──
  const batchFlags = [v.set, v['set-json'], v.merge, v['merge-json'], v['append-json'], v.delete];
  const hasBatchOps = batchFlags.some((arr: unknown) => arr && (arr as unknown[]).length > 0);

  if (hasBatchOps || !['set', 'get', 'delete', 'del', 'list', 'append', 'remove', 'merge'].includes(commandName)) {
    const filepath = commandName;
    if (!filepath) {
      console.error('Usage: set-config <file> --set=\'path=value\' ...');
      process.exit(1);
    }

    const resolvedPath = resolvePath(filepath);
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const adapter = await getAdapter(resolvedPath);

    // ── File lock (optional: --lock) ──
    const useLock = v.lock === true;
    const lockTimeout = v['lock-timeout'] ? parseInt(v['lock-timeout'] as string, 10) : undefined;
    const unlock = useLock ? lockFile(resolvedPath, lockTimeout) : null;

    try {
      const fileExists = fs.existsSync(resolvedPath);
      const data: Record<string, unknown> = (adapter.read(resolvedPath) as Record<string, unknown>) || {};
      let changed = false;

      // Execute ops in flag order
      for (const kv of v.set || []) {
        const [p, v] = splitKV(kv);
        setNested(data, p, parseValue(v));
        changed = true;
        console.log(`✓ Set ${p || '(root)'} = ${v}`);
      }

      for (const kv of v['set-json'] || []) {
        const [p, v] = splitKV(kv);
        setNested(data, p, parseValueStrict(v));
        changed = true;
        console.log(`✓ Set-json ${p || '(root)'} = ${v}`);
      }

      for (const kv of v.merge || []) {
        const [p, v] = splitKV(kv);
        const parsed = parseValue(v);
        if (typeof parsed !== 'object' || parsed === null) {
          throw new Error(`--merge requires a JSON object value, got: ${v}`);
        }
        const result = mergeNested(data, p, parsed);
        if (p === '' && result !== data) Object.assign(data, result);
        changed = true;
        console.log(`✓ Merged into ${p || '(root)'}`);
      }

      for (const kv of v['merge-json'] || []) {
        const [p, v] = splitKV(kv);
        const parsed = parseValueStrict(v);
        if (typeof parsed !== 'object' || parsed === null) {
          throw new Error(`--merge-json requires a JSON object value`);
        }
        const result = mergeNested(data, p, parsed);
        if (p === '' && result !== data) Object.assign(data, result);
        changed = true;
        console.log(`✓ Merged-json into ${p || '(root)'}`);
      }

      for (const kv of v['append-json'] || []) {
        const [p, v] = splitKV(kv);
        const parsed = parseValueStrict(v);
        if (!p) throw new Error('--append-json requires a path');
        const target = getNested(data, p);
        if (target === undefined) throw new Error(`Path not found: ${p}`);
        if (!Array.isArray(target)) throw new Error(`Path is not an array: ${p}`);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          throw new Error('--append-json requires a JSON object value');
        }
        const exists = (target as unknown[]).some(item => JSON.stringify(item) === JSON.stringify(parsed));
        if (!exists) {
          (target as unknown[]).push(parsed);
          changed = true;
          console.log(`✓ Appended to ${p}`);
        } else {
          console.log(`✓ Skipped (already exists): ${p}`);
        }
      }

      for (const p of v.delete || []) {
        // --delete='path' — no '=', entire value is the path
        const delPath = p.includes('=') ? p.split('=')[0] : p;
        const deleted = deleteNested(data, delPath);
        if (deleted) {
          changed = true;
          console.log(`✓ Deleted ${delPath}`);
        } else {
          console.log(`✗ Path not found: ${delPath}`);
        }
      }

      if (!changed) {
        console.log('(no changes)');
        return;
      }

      adapter.write(resolvedPath, data);
      if (!fileExists) {
        console.log(`○ File not found, created: ${resolvedPath}`);
      }
    } finally {
      unlock?.();
    }
    return;
  }

  // ── Subcommand mode ──
  // --lock wraps the entire mutating command in a file lock.

  const useLock = v.lock === true;
  const lockTimeout = v['lock-timeout'] ? parseInt(v['lock-timeout'] as string, 10) : undefined;

  switch (commandName) {
    case 'set': {
      if (cmdArgs.length < 2) {
        console.error('Usage: set <file> [path] <value>');
        process.exit(1);
      }
      const unlock = useLock ? lockFile(resolvePath(cmdArgs[0]), lockTimeout) : null;
      try {
        if (cmdArgs.length === 2) await set(cmdArgs[0], '', cmdArgs[1], jsonMode);
        else await set(cmdArgs[0], cmdArgs[1], cmdArgs[2], jsonMode);
      } finally { unlock?.(); }
      break;
    }

    case 'get':
      await get(cmdArgs[0], cmdArgs[1]);
      break;

    case 'delete':
    case 'del': {
      const unlock = useLock ? lockFile(resolvePath(cmdArgs[0]), lockTimeout) : null;
      try { await del(cmdArgs[0], cmdArgs[1]); }
      finally { unlock?.(); }
      break;
    }

    case 'list':
      await list(cmdArgs[0], cmdArgs[1]);
      break;

    case 'append': {
      if (cmdArgs.length < 3) {
        console.error('Usage: append <file> <path> <value>');
        process.exit(1);
      }
      const unlock = useLock ? lockFile(resolvePath(cmdArgs[0]), lockTimeout) : null;
      try { await append(cmdArgs[0], cmdArgs[1], cmdArgs[2], jsonMode); }
      finally { unlock?.(); }
      break;
    }

    case 'remove': {
      if (cmdArgs.length < 3) {
        console.error('Usage: remove <file> <path> <value>');
        process.exit(1);
      }
      const unlock = useLock ? lockFile(resolvePath(cmdArgs[0]), lockTimeout) : null;
      try { await remove(cmdArgs[0], cmdArgs[1], cmdArgs[2]); }
      finally { unlock?.(); }
      break;
    }

    case 'merge': {
      if (cmdArgs.length < 2) {
        console.error('Usage: merge <file> [path] <value>');
        process.exit(1);
      }
      const unlock = useLock ? lockFile(resolvePath(cmdArgs[0]), lockTimeout) : null;
      try {
        if (cmdArgs.length === 2) await merge(cmdArgs[0], undefined, cmdArgs[1], jsonMode);
        else await merge(cmdArgs[0], cmdArgs[1], cmdArgs[2], jsonMode);
      } finally { unlock?.(); }
      break;
    }

    default:
      console.error(`✗ Unknown command: ${commandName}`);
      console.error("Run 'set-config' without arguments to see help");
      process.exit(1);
  }
}

main();
