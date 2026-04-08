import { getAdapter } from '../adapters/index.js';
import { appendNested, parseValue, resolvePath } from '../utils.js';

export async function append(filepath, keyPath, value) {
  const resolvedPath = resolvePath(filepath);
  const adapter = await getAdapter(resolvedPath);
  const data = adapter.read(resolvedPath) || {};
  appendNested(data, keyPath, parseValue(value));
  adapter.write(resolvedPath, data);
  console.log(`✓ Appended ${value} to ${keyPath}`);
}
