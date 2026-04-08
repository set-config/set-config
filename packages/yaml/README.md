# @set-config/yaml

YAML adapter for set-config CLI.

## Install

```bash
npm install -g @set-config/yaml
```

## Usage

This adapter is automatically loaded when you use `.yaml` or `.yml` files with `set-config`.

```bash
set-config set config.yaml server.port 8080
set-config set config.yaml database.url "postgres://localhost/mydb"
```

## License

MIT
