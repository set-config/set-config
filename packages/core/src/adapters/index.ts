import { ConfigAdapter } from './base.js';
import { JsonAdapter } from './json.js';

const builtInAdapters: ConfigAdapter[] = [new JsonAdapter()];

class AdapterLoader {
  private _externalAdapters: ConfigAdapter[] | null = null;
  private _loading: Promise<ConfigAdapter[]> | null = null;

  async load(): Promise<ConfigAdapter[]> {
    if (this._externalAdapters !== null) return this._externalAdapters;
    if (this._loading) return this._loading;
    this._loading = this._doLoad();
    return this._loading;
  }

  private async _doLoad(): Promise<ConfigAdapter[]> {
    const external: ConfigAdapter[] = [];
    
    try {
      // @ts-ignore — optional runtime dependency
      const mod = await import('@set-config/dotenv');
      const DotenvAdapter = (mod as any).EnvAdapter || (mod as any).DotenvAdapter || mod.default;
      if (DotenvAdapter) external.push(new DotenvAdapter());
    } catch {}

    try {
      // @ts-ignore — optional runtime dependency
      const mod = await import('@set-config/yaml');
      const YamlAdapter = (mod as any).YamlAdapter || mod.default;
      if (YamlAdapter) external.push(new YamlAdapter());
    } catch {}

    try {
      // @ts-ignore — optional runtime dependency
      const mod = await import('@set-config/toml');
      const TomlAdapter = (mod as any).TomlAdapter || mod.default;
      if (TomlAdapter) external.push(new TomlAdapter());
    } catch {}

    try {
      // @ts-ignore — optional runtime dependency
      const mod = await import('@set-config/markdown');
      const MarkdownAdapter = (mod as any).MarkdownAdapter || mod.default;
      if (MarkdownAdapter) external.push(new MarkdownAdapter());
    } catch {}

    this._externalAdapters = external;
    return external;
  }

  getBuiltIn(): ConfigAdapter[] {
    return builtInAdapters;
  }

  async getAll(): Promise<ConfigAdapter[]> {
    const external = await this.load();
    return [...builtInAdapters, ...external];
  }

  async getFor(filename: string): Promise<ConfigAdapter> {
    const all = await this.getAll();
    return all.find(a => a.supports(filename)) || builtInAdapters[0];
  }

  getBuiltInFor(filename: string): ConfigAdapter {
    return builtInAdapters.find(a => a.supports(filename)) || builtInAdapters[0];
  }
}

const loader = new AdapterLoader();

export async function getAllAdapters(): Promise<ConfigAdapter[]> {
  return loader.getAll();
}

export async function getAdapter(filename: string): Promise<ConfigAdapter> {
  return loader.getFor(filename);
}

export function getBuiltInAdapter(filename: string): ConfigAdapter {
  return loader.getBuiltInFor(filename);
}

export async function getSupportedFormats(): Promise<string[]> {
  const formats = ['JSON (.json, .jsonc) - built-in'];
  const external = await loader.load();
  const hasDotenv = external.some(a => a.constructor.name === 'EnvAdapter');
  const hasYaml = external.some(a => a.constructor.name === 'YamlAdapter');
  const hasToml = external.some(a => a.constructor.name === 'TomlAdapter');

  if (hasDotenv) formats.push('ENV (.env) - @set-config/dotenv');
  else formats.push('ENV (.env) - npm install @set-config/dotenv');

  if (hasYaml) formats.push('YAML (.yaml, .yml) - @set-config/yaml');
  else formats.push('YAML (.yaml, .yml) - npm install @set-config/yaml');

  if (hasToml) formats.push('TOML (.toml) - @set-config/toml');
  else formats.push('TOML (.toml) - npm install @set-config/toml');

  const hasMarkdown = external.some(a => a.constructor.name === 'MarkdownAdapter');
  if (hasMarkdown) formats.push('Markdown (.md) - @set-config/markdown');
  else formats.push('Markdown (.md) - npm install @set-config/markdown');

  return formats;
}

export { ConfigAdapter } from './base.js';
export { JsonAdapter } from './json.js';
