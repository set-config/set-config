import path from 'path';

export function parseValue(str: string): unknown {
  if (str === 'true') return true;
  if (str === 'false') return false;
  if (str === 'null') return null;
  if (str === 'undefined') return undefined;
  if (/^\d+$/.test(str)) return parseInt(str, 10);
  if (/^\d+\.\d+$/.test(str)) return parseFloat(str);
  return str;
}

/**
 * Tokenize a key path string, respecting quoted keys that may contain dots.
 * 
 * State machine:
 *   DEFAULT → (quote) → QUOTED
 *   QUOTED → (quote) → DEFAULT
 *   QUOTED → (backslash) → ESCAPED
 *   ESCAPED → (any) → QUOTED
 * 
 * Examples:
 *   a.b.c → ["a", "b", "c"]
 *   a."b.c".d → ["a", "b.c", "d"]
 *   a.'b.c'.d → ["a", "b.c", "d"]
 *   a."b\"c".d → ["a", "b\"c", "d"]
 */
export function tokenizeKeyPath(keyPath: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let state: 'DEFAULT' | 'QUOTED' | 'ESCAPED' = 'DEFAULT';
  let quoteChar: '"' | "'" | null = null;

  for (let i = 0; i < keyPath.length; i++) {
    const ch = keyPath[i];

    switch (state) {
      case 'DEFAULT':
        if (ch === '"' || ch === "'") {
          state = 'QUOTED';
          quoteChar = ch;
        } else if (ch === '.') {
          if (current) {
            tokens.push(current);
            current = '';
          }
        } else {
          current += ch;
        }
        break;

      case 'QUOTED':
        if (ch === '\\') {
          state = 'ESCAPED';
        } else if (ch === quoteChar) {
          state = 'DEFAULT';
          quoteChar = null;
        } else {
          current += ch;
        }
        break;

      case 'ESCAPED':
        current += ch;
        state = 'QUOTED';
        break;
    }
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

export function getNested(obj: unknown, keyPath: string): unknown {
  if (!keyPath) return obj;
  return tokenizeKeyPath(keyPath).reduce((o: unknown, k: string) => (o as Record<string, unknown>)?.[k], obj);
}

export function setNested(obj: unknown, keyPath: string, value: unknown): unknown {
  if (!keyPath) return obj;
  const keys = tokenizeKeyPath(keyPath);
  const last = keys.pop()!;
  const target = keys.reduce((o: Record<string, unknown>, k: string) => {
    if (!(k in o)) o[k] = {};
    return o[k];
  }, obj as Record<string, unknown>);
  target[last] = value;
  return obj;
}

export function deleteNested(obj: unknown, keyPath: string): boolean {
  if (!keyPath) return false;
  const keys = tokenizeKeyPath(keyPath);
  const last = keys.pop()!;
  const target = keys.reduce((o: Record<string, unknown> | undefined, k: string) => (o as Record<string, unknown>)?.[k], obj as Record<string, unknown>);
  if (target && last in target) {
    delete target[last];
    return true;
  }
  return false;
}

export function appendNested(obj: unknown, keyPath: string, value: unknown): void {
  const keys = tokenizeKeyPath(keyPath);
  const last = keys.pop()!;
  const target = keys.reduce((o: Record<string, unknown>, k: string) => {
    if (!(k in o)) o[k] = {};
    return o[k];
  }, obj as Record<string, unknown>);
  if (!Array.isArray(target[last])) target[last] = [];
  (target[last] as unknown[]).push(value);
}

export function removeNested(obj: unknown, keyPath: string, value: unknown): boolean {
  const keys = tokenizeKeyPath(keyPath);
  const last = keys.pop()!;
  const target = keys.reduce((o: Record<string, unknown> | undefined, k: string) => (o as Record<string, unknown>)?.[k], obj as Record<string, unknown>);
  if (Array.isArray(target?.[last])) {
    const arr = target[last] as unknown[];
    const idx = arr.indexOf(value);
    if (idx > -1) {
      arr.splice(idx, 1);
      return true;
    }
  }
  return false;
}

export function resolvePath(filepath: string): string {
  return path.isAbsolute(filepath) ? filepath : path.resolve(process.cwd(), filepath);
}
