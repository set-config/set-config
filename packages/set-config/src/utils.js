import fs from 'fs';
import path from 'path';

export function parseValue(str) {
  if (str === 'true') return true;
  if (str === 'false') return false;
  if (str === 'null') return null;
  if (str === 'undefined') return undefined;
  if (/^\d+$/.test(str)) return parseInt(str, 10);
  if (/^\d+\.\d+$/.test(str)) return parseFloat(str);
  return str;
}

export function getNested(obj, keyPath) {
  if (!keyPath) return obj;
  return keyPath.split('.').reduce((o, k) => o?.[k], obj);
}

export function setNested(obj, keyPath, value) {
  if (!keyPath) return obj;
  const keys = keyPath.split('.');
  const last = keys.pop();
  const target = keys.reduce((o, k) => {
    if (!(k in o)) o[k] = {};
    return o[k];
  }, obj);
  target[last] = value;
  return obj;
}

export function deleteNested(obj, keyPath) {
  if (!keyPath) return false;
  const keys = keyPath.split('.');
  const last = keys.pop();
  const target = keys.reduce((o, k) => o?.[k], obj);
  if (target && last in target) {
    delete target[last];
    return true;
  }
  return false;
}

export function appendNested(obj, keyPath, value) {
  const keys = keyPath.split('.');
  const last = keys.pop();
  const target = keys.reduce((o, k) => {
    if (!(k in o)) o[k] = {};
    return o[k];
  }, obj);
  if (!Array.isArray(target[last])) target[last] = [];
  target[last].push(value);
}

export function removeNested(obj, keyPath, value) {
  const keys = keyPath.split('.');
  const last = keys.pop();
  const target = keys.reduce((o, k) => o?.[k], obj);
  if (Array.isArray(target?.[last])) {
    const idx = target[last].indexOf(value);
    if (idx > -1) {
      target[last].splice(idx, 1);
      return true;
    }
  }
  return false;
}

export function resolvePath(filepath) {
  return path.isAbsolute(filepath) ? filepath : path.resolve(process.cwd(), filepath);
}
