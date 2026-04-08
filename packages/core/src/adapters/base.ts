export abstract class ConfigAdapter {
  abstract read(filepath: string): unknown;
  abstract write(filepath: string, data: unknown): void;
  abstract supports(filename: string): boolean;
}
