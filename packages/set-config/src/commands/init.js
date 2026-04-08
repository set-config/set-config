import fs from 'fs';
import path from 'path';
import { resolvePath } from '../utils.js';
import { getAdapter, getSupportedFormats } from '../adapters/index.js';

export async function init(filepath, format) {
  const resolvedPath = resolvePath(filepath);

  if (fs.existsSync(resolvedPath)) {
    console.log(`✗ File already exists: ${filepath}`);
    return;
  }

  const targetFile = format ? `${filepath}.${format}` : filepath;
  const adapter = await getAdapter(targetFile);

  if (format && !adapter.supports(targetFile)) {
    console.log(`✗ Format not supported: ${format}`);
    const formats = await getSupportedFormats();
    console.log('Supported formats:');
    formats.forEach(f => console.log(`  - ${f}`));
    return;
  }

  const basename = path.basename(filepath, path.extname(filepath));
  adapter.write(resolvedPath, { $schema: `https://example.com/${basename}-schema.json` });
  console.log(`✓ Created ${filepath}`);
}
