# @set-config/core

CLI engine for set-config - set/get/delete JSON values.

**This is the engine package.** For full functionality, use `@set-config/cli` which includes all adapters.

## Quick Start

```bash
# Set a value
npx @set-config/cli set config.json database.host localhost

# Get a value
npx @set-config/cli get config.json database.host

# List keys
npx @set-config/cli list config.json database
```

## Adapters

| Format | Package | Install |
|--------|---------|---------|
| JSON | built-in | - |
| YAML | `@set-config/yaml` | `npx @set-config/yaml` |
| TOML | `@set-config/toml` | `npx @set-config/toml` |
| ENV | `@set-config/dotenv` | `npx @set-config/dotenv` |
| Markdown | `@set-config/markdown` | `npx @set-config/markdown` |

For YAML support:
```bash
npx @set-config/yaml set config.yaml server.port 8080
```

For TOML support:
```bash
npx @set-config/toml set config.toml database.pool 10
```

For ENV support:
```bash
npx @set-config/dotenv set .env API_KEY sk-xxx
```

For Markdown support:
```bash
npx @set-config/markdown set doc.md 'Guide.Install' 'Install steps...'
```

## Full CLI with all formats

```bash
npx @set-config/cli set config.json a.b.c 123
npx @set-config/cli set config.yaml server.port 8080
npx @set-config/cli set config.toml database.pool 10
```

## License

MIT
