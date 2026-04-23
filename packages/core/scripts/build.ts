import fs from 'fs';
import { build } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const scriptDir = resolve(dirname(fileURLToPath(import.meta.url)));
const root = resolve(scriptDir, '..');
const pkg = JSON.parse(fs.readFileSync(resolve(root, 'package.json'), 'utf8'));

// Build library entry (lib.ts → dist/index.js)
await build({
  root,
  build: {
    lib: {
      entry: resolve(root, 'src/lib.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: ['fs', 'path', 'util'],
      output: {
        entryFileNames: 'index.js',
      },
    },
  },
});

// Build CLI entry (cli.ts → dist/cli.js)
await build({
  root,
  build: {
    lib: {
      entry: resolve(root, 'src/cli.ts'),
      formats: ['es'],
      fileName: 'cli',
    },
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      external: ['fs', 'path', 'util', '@set-config/core'],
      output: {
        entryFileNames: 'cli.js',
      },
    },
  },
});

// Generate dist/package.json
// Expose both library (.) and CLI (./cli) entry points
const distPkg = {
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  type: pkg.type,
  main: 'index.js',
  exports: {
    '.': './index.js',
    './cli': './cli.js',
  },
  bin: {
    'set-config': './bin/set-config',
  },
  repository: pkg.repository,
  publishConfig: pkg.publishConfig,
};

fs.writeFileSync(resolve(root, 'dist/package.json'), JSON.stringify(distPkg, null, 2) + '\n');

// Write bin — points to CLI entry
fs.mkdirSync(resolve(root, 'dist/bin'), { recursive: true });
fs.writeFileSync(resolve(root, 'dist/bin/set-config'), `#!/usr/bin/env node
import '../cli.js';
`);
fs.chmodSync(resolve(root, 'dist/bin/set-config'), 0o755);

console.log(`✓ Built ${pkg.name}`);
