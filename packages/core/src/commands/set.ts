import fs from 'fs';
import path from 'path';
import { getAdapter } from '../adapters/index.js';
import { setNested, parseValue, parseValueStrict, resolvePath } from '../utils.js';

export async function set(filepath: string, keyPath: string, value: string, jsonMode = false): Promise<void> {
  const resolvedPath = resolvePath(filepath);
  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const adapter = await getAdapter(resolvedPath);
  const fileExists = fs.existsSync(resolvedPath);
  let data = adapter.read(resolvedPath) || {};

  // Empty path with no file: start from null, let setNested replace entirely
  if (!fileExists && !keyPath) {
    data = null;
  }

  const parsed = jsonMode ? parseValueStrict(value) : parseValue(value);
  data = setNested(data, keyPath, parsed);
  adapter.write(resolvedPath, data);
  if (!fileExists) {
    console.log(`○ File not found, created: ${resolvedPath}`);
  }
  console.log(`✓ Set ${keyPath || '(root)'} = ${value}`);
}
