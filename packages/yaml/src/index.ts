import fs from 'fs';
import YAML from 'yaml';

/**
 * YAML Adapter for set-config
 */
export class YamlAdapter {
  supports(filename: string): boolean {
    return /\.(yaml|yml)$/i.test(filename);
  }

  read(filepath: string): unknown {
    if (!fs.existsSync(filepath)) return null;
    const content = fs.readFileSync(filepath, 'utf8');
    return content.trim() ? parseYaml(content) : null;
  }

  write(filepath: string, data: unknown): void {
    fs.writeFileSync(filepath, stringifyYaml(data));
  }
}

export default YamlAdapter;

// ─── Re-exported utilities for reuse by other adapters (e.g. markdown frontmatter) ───

export function parseYaml(content: string): unknown {
  if (!content.trim()) return null;
  try {
    return YAML.parse(content);
  } catch {
    return null;
  }
}

export function stringifyYaml(data: unknown): string {
  return YAML.stringify(data);
}
