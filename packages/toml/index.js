import fs from 'fs';
import TOML from '@iarna/toml';

/**
 * TOML Adapter for set-config
 */
export class TomlAdapter {
  supports(filename) {
    return /\.toml$/i.test(filename);
  }

  read(filepath) {
    if (!fs.existsSync(filepath)) return null;
    const content = fs.readFileSync(filepath, 'utf8');
    return content.trim() ? TOML.parse(content) : null;
  }

  write(filepath, data) {
    fs.writeFileSync(filepath, TOML.stringify(data));
  }
}

export default TomlAdapter;
