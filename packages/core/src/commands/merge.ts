import fs from 'fs';
import path from 'path';
import { getAdapter } from '../adapters/index.js';
import { mergeNested, parseValue, parseValueStrict, resolvePath } from '../utils.js';

export async function merge(filepath: string, keyPath: string | undefined, value: string, jsonMode = false): Promise<void> {
  const resolvedPath = resolvePath(filepath);
  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const adapter = await getAdapter(resolvedPath);
  const fileExists = fs.existsSync(resolvedPath);
  const data = adapter.read(resolvedPath) || {};

  // Normalize: undefined/empty path both mean merge into root
  const pathArg = keyPath || '';
  const parsed = jsonMode ? parseValueStrict(value) : parseValue(value);

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('merge requires a JSON object value');
  }

  const result = mergeNested(data, pathArg, parsed);
  adapter.write(resolvedPath, result);
  if (!fileExists) {
    console.log(`○ File not found, created: ${resolvedPath}`);
  }
  console.log(`✓ Merged into ${pathArg || '(root)'}`);
}
