import path from 'path';

export function parseValue(str: string): unknown {
  if (str === 'true') return true;
  if (str === 'false') return false;
  if (str === 'null') return null;
  if (str === 'undefined') return undefined;
  if (/^-?\d+$/.test(str)) return parseInt(str, 10);
  if (/^-?\d+\.\d+$/.test(str)) return parseFloat(str);
  // Try JSON parse for objects/arrays (e.g. '{"key":"val"}' or '[1,2]')
  if (str.startsWith('{') || str.startsWith('[')) {
    try { return JSON.parse(str); } catch {}
  }
  return str;
}

/**
 * Strict JSON parse — skips heuristic, fails on invalid JSON.
 * Used when --json flag is passed.
 */
export function parseValueStrict(str: string): unknown {
  try {
    return JSON.parse(str);
  } catch (err) {
    throw new Error(`Invalid JSON: ${(err as Error).message}`);
  }
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
  let state: 'DEFAULT' | 'QUOTED' | 'ESCAPED' | 'INDEX' = 'DEFAULT';
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
        } else if (ch === '[') {
          if (current) {
            tokens.push(current);
            current = '';
          }
          state = 'INDEX';
        } else {
          current += ch;
        }
        break;

      case 'INDEX':
        if (ch === ']') {
          if (current) {
            tokens.push(current);
            current = '';
          }
          state = 'DEFAULT';
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
  return tokenizeKeyPath(keyPath).reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], obj);
}

export function setNested(obj: unknown, keyPath: string, value: unknown): unknown {
  if (!keyPath) {
    // Empty path: replace entire object (for set --json)
    return value;
  }
  const keys = tokenizeKeyPath(keyPath);
  const last = keys.pop()!;
  const target = keys.reduce<Record<string, unknown>>((o, k) => {
    if (!(k in o)) o[k] = {};
    return o[k] as Record<string, unknown>;
  }, obj as Record<string, unknown>);
  target[last] = value;
  return obj;
}

/**
 * Deep merge source into target. Only plain objects are merged recursively;
 * arrays and primitives are replaced.
 */
export function deepMerge(target: unknown, source: unknown): unknown {
  if (isPlainObject(source) && isPlainObject(target)) {
    const result = { ...target } as Record<string, unknown>;
    for (const key of Object.keys(source as Record<string, unknown>)) {
      result[key] = deepMerge(
        (target as Record<string, unknown>)[key],
        (source as Record<string, unknown>)[key],
      );
    }
    return result;
  }
  return source;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
}

/**
 * Merge source into target at keyPath. Creates intermediate path if needed.
 * Empty path merges into root object.
 */
export function mergeNested(obj: unknown, keyPath: string, value: unknown): unknown {
  if (!keyPath) {
    // Empty path: merge into root object
    return deepMerge(obj, value);
  }
  const keys = tokenizeKeyPath(keyPath);
  const last = keys.pop()!;
  const parent = keys.reduce((o: Record<string, unknown>, k: string) => {
    if (!(k in o)) o[k] = {};
    return o[k] as Record<string, unknown>;
  }, obj as Record<string, unknown>);
  if (isPlainObject(parent[last]) && isPlainObject(value)) {
    parent[last] = deepMerge(parent[last], value);
  } else {
    parent[last] = value;
  }
  return obj;
}

export function deleteNested(obj: unknown, keyPath: string): boolean {
  if (!keyPath) return false;
  const keys = tokenizeKeyPath(keyPath);
  const last = keys.pop()!;
  const target = keys.reduce<Record<string, unknown> | undefined>((o, k) => o?.[k] as Record<string, unknown> | undefined, obj as Record<string, unknown>);
  if (target && last in target) {
    delete target[last];
    return true;
  }
  return false;
}

export function appendNested(obj: unknown, keyPath: string, value: unknown): void {
  const keys = tokenizeKeyPath(keyPath);
  const last = keys.pop()!;
  const target = keys.reduce<Record<string, unknown>>((o, k) => {
    if (!(k in o)) o[k] = {};
    return o[k] as Record<string, unknown>;
  }, obj as Record<string, unknown>);
  if (!Array.isArray(target[last])) target[last] = [];
  (target[last] as unknown[]).push(value);
}

export function removeNested(obj: unknown, keyPath: string, value: unknown): boolean {
  const keys = tokenizeKeyPath(keyPath);
  const last = keys.pop()!;
  const target = keys.reduce<Record<string, unknown> | undefined>((o, k) => o?.[k] as Record<string, unknown> | undefined, obj as Record<string, unknown>);
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

/**
 * Split on first '=' — returns [path, value].
 * No '=' means path is empty, entire string is value.
 */
export function splitKV(raw: string): [string, string] {
  const idx = raw.indexOf('=');
  if (idx === -1) return ['', raw];
  return [raw.slice(0, idx), raw.slice(idx + 1)];
}
