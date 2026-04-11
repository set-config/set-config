import fs from 'fs';
import path from 'path';
import { getAdapter } from '../adapters/index.js';
import { setNested, parseValue, resolvePath } from '../utils.js';

export async function set(filepath: string, keyPath: string, value: string): Promise<void> {
  const resolvedPath = resolvePath(filepath);
  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const adapter = await getAdapter(resolvedPath);
  const fileExists = fs.existsSync(resolvedPath);
  const data = adapter.read(resolvedPath) || {};
  setNested(data, keyPath, parseValue(value));
  adapter.write(resolvedPath, data);
  if (!fileExists) {
    console.log(`○ File not found, created: ${resolvedPath}`);
  }
  console.log(`✓ Set ${keyPath} = ${value}`);
}
