import fs from 'fs';
import YAML from 'yaml';

/**
 * YAML Adapter for set-config
 */
export class YamlAdapter {
  supports(filename) {
    return /\.(yaml|yml)$/i.test(filename);
  }

  read(filepath) {
    if (!fs.existsSync(filepath)) return null;
    const content = fs.readFileSync(filepath, 'utf8');
    return content.trim() ? YAML.parse(content) : null;
  }

  write(filepath, data) {
    fs.writeFileSync(filepath, YAML.stringify(data));
  }
}

export default YamlAdapter;
