# @set-config/yaml

YAML adapter for set-config CLI.

This is an optional adapter. When you install `@set-config/cli`, YAML support is NOT included by default. Install this package to add YAML support.

## Install

```bash
npm install -g @set-config/yaml
```

Or if using as a local package:

```bash
npm install @set-config/yaml
```

## Usage

After installation, `set-config` automatically detects and uses this adapter for `.yaml` and `.yml` files.

```bash
set-config set config.yaml server.port 8080
set-config set config.yaml database.url "postgres://localhost/mydb"
```

## License

MIT
