import { getAdapter } from '../adapters/index.js';
import { setNested, parseValue, resolvePath } from '../utils.js';

export async function set(filepath, keyPath, value) {
  const resolvedPath = resolvePath(filepath);
  const adapter = await getAdapter(resolvedPath);
  const data = adapter.read(resolvedPath) || {};
  setNested(data, keyPath, parseValue(value));
  adapter.write(resolvedPath, data);
  console.log(`✓ Set ${keyPath} = ${value}`);
}
