import fs from 'fs';
import TOML from '@iarna/toml';

/**
 * TOML Adapter for set-config
 */
export class TomlAdapter {
  supports(filename: string): boolean {
    return /\.toml$/i.test(filename);
  }

  read(filepath: string): unknown {
    if (!fs.existsSync(filepath)) return null;
    const content = fs.readFileSync(filepath, 'utf8');
    return content.trim() ? TOML.parse(content) : null;
  }

  write(filepath: string, data: unknown): void {
    fs.writeFileSync(filepath, TOML.stringify(data as Record<string, unknown>));
  }
}

export default TomlAdapter;
