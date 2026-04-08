import { getAdapter } from '../adapters/index.js';
import { deleteNested, resolvePath } from '../utils.js';

export async function del(filepath: string, keyPath: string): Promise<void> {
  const resolvedPath = resolvePath(filepath);
  const adapter = await getAdapter(resolvedPath);
  const data = adapter.read(resolvedPath) || {};
  const deleted = deleteNested(data, keyPath);
  if (deleted) {
    adapter.write(resolvedPath, data);
    console.log(`✓ Deleted ${keyPath}`);
  } else {
    console.log(`✗ Path not found: ${keyPath}`);
  }
}
