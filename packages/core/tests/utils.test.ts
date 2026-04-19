import { describe, it, expect } from 'vitest';
import { tokenizeKeyPath, getNested, setNested, deleteNested, parseValue, parseValueStrict, deepMerge, mergeNested } from '../src/utils.js';

describe('tokenizeKeyPath', () => {
  it('should tokenize simple keys without quotes', () => {
    expect(tokenizeKeyPath('a.b.c')).toEqual(['a', 'b', 'c']);
  });

  it('should tokenize keys with double-quoted segments containing dots', () => {
    expect(tokenizeKeyPath('a."b.c".d')).toEqual(['a', 'b.c', 'd']);
  });

  it('should tokenize keys with single-quoted segments containing dots', () => {
    expect(tokenizeKeyPath("a.'b.c'.d")).toEqual(['a', 'b.c', 'd']);
  });

  it('should handle model names with dots in quotes', () => {
    expect(tokenizeKeyPath('provider.minimax.models."MiniMax-M2.7-highspeed".limit.context'))
      .toEqual(['provider', 'minimax', 'models', 'MiniMax-M2.7-highspeed', 'limit', 'context']);
  });

  it('should handle escaped quotes inside quoted segments', () => {
    expect(tokenizeKeyPath('a."b\\"c".d')).toEqual(['a', 'b"c', 'd']);
  });

  it('should handle empty path', () => {
    expect(tokenizeKeyPath('')).toEqual([]);
  });

  it('should ignore leading and trailing dots', () => {
    expect(tokenizeKeyPath('.a.b.c.')).toEqual(['a', 'b', 'c']);
  });

  it('should handle consecutive dots', () => {
    expect(tokenizeKeyPath('a..b')).toEqual(['a', 'b']);
  });

  it('should handle single key without dots', () => {
    expect(tokenizeKeyPath('a')).toEqual(['a']);
  });

  it('should handle key with version-like segments', () => {
    expect(tokenizeKeyPath('models."v1.2.3".config')).toEqual(['models', 'v1.2.3', 'config']);
  });
});

describe('getNested', () => {
  it('should get nested value with simple keys', () => {
    const obj = { a: { b: { c: 123 } } };
    expect(getNested(obj, 'a.b.c')).toBe(123);
  });

  it('should get nested value with quoted keys containing dots', () => {
    const obj = { provider: { minimax: { models: { 'MiniMax-M2.7-highspeed': { limit: { context: 200000 } } } } } };
    expect(getNested(obj, 'provider.minimax.models."MiniMax-M2.7-highspeed".limit.context')).toBe(200000);
  });

  it('should return undefined for non-existent path', () => {
    const obj = { a: { b: 123 } };
    expect(getNested(obj, 'a.c')).toBeUndefined();
  });
});

describe('setNested', () => {
  it('should set nested value with simple keys', () => {
    const obj: any = {};
    setNested(obj, 'a.b.c', 123);
    expect(obj).toEqual({ a: { b: { c: 123 } } });
  });

  it('should set nested value with quoted keys containing dots', () => {
    const obj: any = {};
    setNested(obj, 'provider.minimax.models."MiniMax-M2.7-highspeed".limit.context', 200000);
    expect(obj).toEqual({
      provider: {
        minimax: {
          models: {
            'MiniMax-M2.7-highspeed': {
              limit: { context: 200000 }
            }
          }
        }
      }
    });
  });

  it('should overwrite existing nested value', () => {
    const obj: any = { a: { b: { c: 123 } } };
    setNested(obj, 'a.b.c', 456);
    expect(obj.a.b.c).toBe(456);
  });
});

describe('deleteNested', () => {
  it('should delete nested value with simple keys', () => {
    const obj: any = { a: { b: { c: 123 } } };
    expect(deleteNested(obj, 'a.b.c')).toBe(true);
    expect(obj).toEqual({ a: { b: {} } });
  });

  it('should delete nested value with quoted keys containing dots', () => {
    const obj: any = { provider: { minimax: { models: { 'MiniMax-M2.7-highspeed': { limit: { context: 200000 } } } } } };
    expect(deleteNested(obj, 'provider.minimax.models."MiniMax-M2.7-highspeed".limit.context')).toBe(true);
    expect(obj.provider.minimax.models['MiniMax-M2.7-highspeed'].limit).toEqual({});
  });

  it('should return false for non-existent path', () => {
    const obj: any = { a: { b: 123 } };
    expect(deleteNested(obj, 'a.c')).toBe(false);
  });
});

describe('parseValue', () => {
  it('should parse numbers', () => {
    expect(parseValue('123')).toBe(123);
    expect(parseValue('0')).toBe(0);
  });

  it('should parse negative numbers', () => {
    expect(parseValue('-42')).toBe(-42);
    expect(parseValue('-3.14')).toBe(-3.14);
  });

  it('should parse floats', () => {
    expect(parseValue('3.14')).toBe(3.14);
    expect(parseValue('0.5')).toBe(0.5);
  });

  it('should parse booleans', () => {
    expect(parseValue('true')).toBe(true);
    expect(parseValue('false')).toBe(false);
  });

  it('should parse null', () => {
    expect(parseValue('null')).toBe(null);
  });

  it('should parse undefined', () => {
    expect(parseValue('undefined')).toBe(undefined);
  });

  it('should parse strings as-is', () => {
    expect(parseValue('hello')).toBe('hello');
    expect(parseValue('hello world')).toBe('hello world');
  });

  it('should parse JSON objects', () => {
    expect(parseValue('{"key":"val"}')).toEqual({ key: 'val' });
    expect(parseValue('{"a":1,"b":2}')).toEqual({ a: 1, b: 2 });
  });

  it('should parse JSON arrays', () => {
    expect(parseValue('[1,2,3]')).toEqual([1, 2, 3]);
    expect(parseValue('["a","b","c"]')).toEqual(['a', 'b', 'c']);
  });

  it('should return string for invalid JSON', () => {
    expect(parseValue('{invalid}')).toBe('{invalid}');
    expect(parseValue('[1,2')).toBe('[1,2');
  });
});

describe('parseValueStrict', () => {
  it('should parse valid JSON string', () => {
    expect(parseValueStrict('"hello"')).toBe('hello');
  });

  it('should parse valid JSON number', () => {
    expect(parseValueStrict('42')).toBe(42);
    expect(parseValueStrict('3.14')).toBe(3.14);
  });

  it('should parse valid JSON boolean', () => {
    expect(parseValueStrict('true')).toBe(true);
    expect(parseValueStrict('false')).toBe(false);
  });

  it('should parse valid JSON null', () => {
    expect(parseValueStrict('null')).toBe(null);
  });

  it('should throw on invalid JSON', () => {
    expect(() => parseValueStrict('hello')).toThrow('Invalid JSON');
    expect(() => parseValueStrict('{invalid}')).toThrow('Invalid JSON');
  });
});

describe('deepMerge', () => {
  it('should deep merge plain objects', () => {
    const target = { a: 1, b: { c: 2, d: 3 } };
    const source = { b: { c: 20, e: 4 }, f: 5 };
    expect(deepMerge(target, source)).toEqual({ a: 1, b: { c: 20, d: 3, e: 4 }, f: 5 });
  });

  it('should replace arrays', () => {
    const target = { items: [1, 2] };
    const source = { items: [3, 4] };
    expect(deepMerge(target, source)).toEqual({ items: [3, 4] });
  });

  it('should replace primitives', () => {
    const target = { a: 1 };
    const source = { a: 'string' };
    expect(deepMerge(target, source)).toEqual({ a: 'string' });
  });

  it('should handle null source', () => {
    const target = { a: 1 };
    expect(deepMerge(target, null)).toBe(null);
  });

  it('should handle non-object source', () => {
    const target = { a: 1 };
    expect(deepMerge(target, 'string')).toBe('string');
  });

  it('should not mutate target', () => {
    const target = { a: { b: 1 } };
    const source = { a: { c: 2 } };
    const result = deepMerge(target, source);
    expect(target.a.b).toBe(1);
    expect(result.a).toEqual({ b: 1, c: 2 });
  });
});

describe('mergeNested', () => {
  it('should merge at root with empty path', () => {
    const obj = { a: 1 };
    const result = mergeNested(obj, '', { b: 2 });
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('should merge at nested path', () => {
    const obj = { x: { y: 1 }, other: true };
    mergeNested(obj, 'x', { y: 2, z: 3 });
    expect(obj).toEqual({ x: { y: 2, z: 3 }, other: true });
  });

  it('should create intermediate path and merge', () => {
    const obj: any = {};
    mergeNested(obj, 'a.b.c', { d: 1 });
    expect(obj.a.b.c).toEqual({ d: 1 });
  });
});