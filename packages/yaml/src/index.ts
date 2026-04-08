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
    return content.trim() ? YAML.parse(content) : null;
  }

  write(filepath: string, data: unknown): void {
    fs.writeFileSync(filepath, YAML.stringify(data));
  }
}

export default YamlAdapter;
