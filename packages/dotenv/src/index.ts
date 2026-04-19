import fs from 'fs';

/**
 * Base interface for config adapters.
 * Duplicated from @set-config/core to avoid circular dependency.
 */
interface ConfigAdapterLike {
  supports(filename: string): boolean;
  read(filepath: string): unknown;
  write(filepath: string, data: unknown): void;
}

/**
 * ENV Adapter for set-config.
 * 
 * Supports .env files with KEY=VALUE format.
 * - Values are always strings (no type parsing)
 * - Preserves ordering
 * - Ignores empty lines and comment lines (# ...)
 * - Handles quoted values (single and double quotes)
 * - Handles export prefix (export KEY=VALUE)
 * - Flat structure only: no nesting, path dots treated as literal key
 */
export class EnvAdapter implements ConfigAdapterLike {
  supports(filename: string): boolean {
    return /\.env/.test(filename);
  }

  read(filepath: string): unknown {
    if (!fs.existsSync(filepath)) return null;
    const content = fs.readFileSync(filepath, 'utf8');
    if (!content.trim()) return null;

    const result: Record<string, string> = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Strip optional 'export ' prefix
      const kv = trimmed.startsWith('export ') ? trimmed.slice(7) : trimmed;
      const eqIdx = kv.indexOf('=');
      if (eqIdx === -1) continue;

      const key = kv.slice(0, eqIdx).trim();
      let value = kv.slice(eqIdx + 1).trim();

      // Strip surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      result[key] = value;
    }
    return result;
  }

  write(filepath: string, data: unknown): void {
    const obj = data as Record<string, string>;
    const lines = Object.entries(obj).map(([key, value]) => `${key}=${value}`);
    fs.writeFileSync(filepath, lines.join('\n') + '\n');
  }
}

export default EnvAdapter;
