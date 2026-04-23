/**
 * @set-config/core — Library entry point.
 *
 * Exports utilities, adapter base, and adapter loader
 * for use by adapter packages and the CLI.
 */

// ─── Utilities ───

export {
  parseValue,
  parseValueStrict,
  getNested,
  setNested,
  mergeNested,
  deleteNested,
  appendNested,
  removeNested,
  resolvePath,
  splitKV,
  tokenizeKeyPath,
} from './utils.js';

// ─── Adapter system ───

export { ConfigAdapter } from './adapters/base.js';
export { JsonAdapter } from './adapters/json.js';
export {
  getAllAdapters,
  getAdapter,
  getBuiltInAdapter,
  getSupportedFormats,
} from './adapters/index.js';
