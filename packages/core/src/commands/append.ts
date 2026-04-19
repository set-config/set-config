import { getAdapter } from '../adapters/index.js';
import { appendNested, getNested, parseValue, parseValueStrict, resolvePath } from '../utils.js';

export async function append(filepath: string, keyPath: string, value: string, jsonMode = false): Promise<void> {
  const resolvedPath = resolvePath(filepath);
  const adapter = await getAdapter(resolvedPath);
  const data = adapter.read(resolvedPath) || {};
  const parsed = jsonMode ? parseValueStrict(value) : parseValue(value);

  if (jsonMode) {
    // Strict mode: path must exist, must be array, value must be object, idempotent
    if (!keyPath) {
      throw new Error('append --json requires a path');
    }
    const target = getNested(data, keyPath);
    if (target === undefined) {
      throw new Error(`Path not found: ${keyPath} (append --json does not auto-create arrays)`);
    }
    if (!Array.isArray(target)) {
      throw new Error(`Path is not an array: ${keyPath}`);
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('append --json requires a JSON object value');
    }
    // Idempotent: skip if identical object already exists (JSON.stringify comparison)
    const exists = target.some(item => JSON.stringify(item) === JSON.stringify(parsed));
    if (exists) {
      console.log(`✓ Skipped (already exists): ${keyPath}`);
      return;
    }
    (target as unknown[]).push(parsed);
  } else {
    // Default mode: auto-create array, push value
    appendNested(data, keyPath, parsed);
  }

  adapter.write(resolvedPath, data);
  if (jsonMode) {
    console.log(`✓ Appended to ${keyPath}`);
  } else {
    console.log(`✓ Appended ${value} to ${keyPath}`);
  }
}
