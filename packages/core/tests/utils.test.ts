import { describe, it, expect } from 'vitest';
import { tokenizeKeyPath, getNested, setNested, deleteNested } from '../src/utils.js';

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