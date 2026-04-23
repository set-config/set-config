import fs from 'fs';
import { build } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const scriptDir = resolve(dirname(fileURLToPath(import.meta.url)));
const root = resolve(scriptDir, '..');
const pkg = JSON.parse(fs.readFileSync(resolve(root, 'package.json'), 'utf8'));

// Build with vite for Node.js
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
      external: ['@set-config/core', '@set-config/core/cli', '@set-config/dotenv', '@set-config/yaml', '@set-config/toml'],
      output: {
        entryFileNames: 'index.js',
      },
    },
  },
});

// Get actual version from node_modules
function getVersion(name: string): string {
  try {
    const pkgPath = resolve(root, `node_modules/${name}/package.json`);
    return JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
  } catch {
    return '*';
  }
}

// Generate dist/package.json with resolved versions
// Adjust bin path for dist (remove leading ./dist/ since we publish from dist)
const distBinPath = pkg.bin['set-config'].replace('./dist', '.');
const distPkg = {
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  type: pkg.type,
  main: 'index.js',
  bin: {
    'set-config': distBinPath,
  },
  repository: pkg.repository,
  publishConfig: pkg.publishConfig,
  dependencies: {
    '@set-config/core': getVersion('@set-config/core'),
    '@set-config/dotenv': getVersion('@set-config/dotenv'),
    '@set-config/yaml': getVersion('@set-config/yaml'),
    '@set-config/toml': getVersion('@set-config/toml'),
  },
};

fs.writeFileSync(resolve(root, 'dist/package.json'), JSON.stringify(distPkg, null, 2) + '\n');

// Write bin with correct import path
fs.mkdirSync(resolve(root, 'dist/bin'), { recursive: true });
fs.writeFileSync(resolve(root, 'dist/bin/set-config'), `#!/usr/bin/env node
import '../index.js';
`);

console.log(`✓ Built ${pkg.name}`);
