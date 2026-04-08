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
      external: ['fs', 'path', 'util'],
      output: {
        entryFileNames: 'index.js',
      },
    },
  },
});

// Generate dist/package.json
// NOTE: core package does NOT expose CLI bin - only engine
// CLI is exposed via @set-config/cli, @set-config/yaml, @set-config/toml
const distPkg = {
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  type: pkg.type,
  main: 'index.js',
  repository: pkg.repository,
  publishConfig: pkg.publishConfig,
};

fs.writeFileSync(resolve(root, 'dist/package.json'), JSON.stringify(distPkg, null, 2) + '\n');

console.log(`✓ Built ${pkg.name}`);
