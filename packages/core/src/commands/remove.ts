import { getAdapter } from '../adapters/index.js';
import { removeNested, parseValue, resolvePath } from '../utils.js';

export async function remove(filepath: string, keyPath: string, value: string): Promise<void> {
  const resolvedPath = resolvePath(filepath);
  const adapter = await getAdapter(resolvedPath);
  const data = adapter.read(resolvedPath) || {};
  const removed = removeNested(data, keyPath, parseValue(value));
  if (removed) {
    adapter.write(resolvedPath, data);
    console.log(`✓ Removed ${value} from ${keyPath}`);
  } else {
    console.log(`✗ Value not found in array: ${keyPath}`);
  }
}
