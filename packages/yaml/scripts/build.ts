import fs from 'fs';
import { build } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const scriptDir = resolve(dirname(fileURLToPath(import.meta.url)));
const root = resolve(scriptDir, '..');
const pkg = JSON.parse(fs.readFileSync(resolve(root, 'package.json'), 'utf8'));

// Build with vite
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
      external: ['fs', 'yaml'],
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
const distPkg = {
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  type: pkg.type,
  main: 'index.js',
  repository: pkg.repository,
  publishConfig: pkg.publishConfig,
  dependencies: {
    '@set-config/core': getVersion('@set-config/core'),
    'yaml': pkg.dependencies.yaml,
  },
};

fs.writeFileSync(resolve(root, 'dist/package.json'), JSON.stringify(distPkg, null, 2) + '\n');

// Write cli.js that imports @set-config/core
fs.writeFileSync(resolve(root, 'dist/cli.js'), `#!/usr/bin/env node
import '@set-config/core';
`);

console.log(`✓ Built ${pkg.name}`);
