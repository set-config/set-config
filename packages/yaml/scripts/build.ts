import fs from 'fs';
import { build } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const scriptDir = resolve(dirname(fileURLToPath(import.meta.url)));
const root = resolve(scriptDir, '..');
const pkg = JSON.parse(fs.readFileSync(resolve(root, 'package.json'), 'utf8'));

// Build with vite — bundle yaml, tree-shake unused exports
await build({
  root,
  build: {
    lib: {
      entry: resolve(root, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: ['fs'],
      output: {
        entryFileNames: 'index.js',
      },
    },
  },
});

// Generate dist/package.json — no yaml dependency (bundled)
const distPkg = {
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  type: pkg.type,
  main: 'index.js',
  bin: {
    'set-config': './bin/set-config',
  },
  repository: pkg.repository,
  publishConfig: pkg.publishConfig,
  dependencies: {
    '@set-config/core': '*',
  },
};

fs.writeFileSync(resolve(root, 'dist/package.json'), JSON.stringify(distPkg, null, 2) + '\n');

// Write bin/set-config
fs.mkdirSync(resolve(root, 'dist/bin'), { recursive: true });
fs.writeFileSync(resolve(root, 'dist/bin/set-config'), `#!/usr/bin/env node
import '@set-config/core/cli';
`);

console.log(`✓ Built ${pkg.name}`);
