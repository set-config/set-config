import { getAdapter } from '../adapters/index.js';
import { getNested, resolvePath } from '../utils.js';

export async function list(filepath, keyPath) {
  const resolvedPath = resolvePath(filepath);
  const adapter = await getAdapter(resolvedPath);
  const data = adapter.read(resolvedPath);
  if (data === null) {
    console.log('File not found or empty');
    return;
  }
  console.log(JSON.stringify(keyPath ? getNested(data, keyPath) : data, null, 2));
}
