import fs from 'fs';
import { ConfigAdapter } from './base.js';

export class JsonAdapter extends ConfigAdapter {
  supports(filename: string): boolean {
    return /\.(json|jsonc)$/i.test(filename);
  }

  read(filepath: string): unknown {
    if (!fs.existsSync(filepath)) return null;
    const content = fs.readFileSync(filepath, 'utf8');
    const stripped = this._stripComments(content);
    return stripped.trim() ? JSON.parse(stripped) : null;
  }

  write(filepath: string, data: unknown): void {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n');
  }

  _stripComments(content: string): string {
    let result = content.replace(/(?:^|\s)\/\/.*$/gm, '');
    result = result.replace(/\/\*[\s\S]*?\*\//g, '');
    return result;
  }
}
