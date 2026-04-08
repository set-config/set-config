# @set-config/toml

TOML adapter for set-config CLI.

This is an optional adapter. When you install `@set-config/cli`, TOML support is NOT included by default. Install this package to add TOML support.

## Install

```bash
npm install -g @set-config/toml
```

Or if using as a local package:

```bash
npm install @set-config/toml
```

## Usage

After installation, `set-config` automatically detects and uses this adapter for `.toml` files.

```bash
set-config set config.toml app.name "MyApp"
set-config set config.toml app.debug true
```

## License

MIT
