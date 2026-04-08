import { ConfigAdapter } from './base.js';
import { JsonAdapter } from './json.js';

const builtInAdapters = [new JsonAdapter()];

class AdapterLoader {
  constructor() {
    this._externalAdapters = null;
    this._loading = null;
  }

  async load() {
    if (this._externalAdapters !== null) return this._externalAdapters;
    if (this._loading) return this._loading;
    this._loading = this._doLoad();
    return this._loading;
  }

  async _doLoad() {
    const external = [];
    try {
      const mod = await import('@set-config/yaml');
      const YamlAdapter = mod.YamlAdapter || mod.default;
      if (YamlAdapter) external.push(new YamlAdapter());
    } catch {}

    try {
      const mod = await import('@set-config/toml');
      const TomlAdapter = mod.TomlAdapter || mod.default;
      if (TomlAdapter) external.push(new TomlAdapter());
    } catch {}

    this._externalAdapters = external;
    return external;
  }

  getBuiltIn() {
    return builtInAdapters;
  }

  async getAll() {
    const external = await this.load();
    return [...builtInAdapters, ...external];
  }

  async getFor(filename) {
    const all = await this.getAll();
    return all.find(a => a.supports(filename)) || builtInAdapters[0];
  }

  getBuiltInFor(filename) {
    return builtInAdapters.find(a => a.supports(filename)) || builtInAdapters[0];
  }
}

const loader = new AdapterLoader();

export async function getAllAdapters() {
  return loader.getAll();
}

export async function getAdapter(filename) {
  return loader.getFor(filename);
}

export function getBuiltInAdapter(filename) {
  return loader.getBuiltInFor(filename);
}

export async function getSupportedFormats() {
  const formats = ['JSON (.json, .jsonc) - built-in'];
  const external = await loader.load();
  const hasYaml = external.some(a => a.constructor.name === 'YamlAdapter');
  const hasToml = external.some(a => a.constructor.name === 'TomlAdapter');

  if (hasYaml) formats.push('YAML (.yaml, .yml) - @set-config/yaml');
  else formats.push('YAML (.yaml, .yml) - npm install @set-config/yaml');

  if (hasToml) formats.push('TOML (.toml) - @set-config/toml');
  else formats.push('TOML (.toml) - npm install @set-config/toml');

  return formats;
}

export { ConfigAdapter } from './base.js';
export { JsonAdapter } from './json.js';
