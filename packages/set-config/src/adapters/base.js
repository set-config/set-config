/**
 * Base adapter interface
 */
export class ConfigAdapter {
  read(filepath) {
    throw new Error('Not implemented');
  }

  write(filepath, data) {
    throw new Error('Not implemented');
  }

  supports(filename) {
    return false;
  }
}
