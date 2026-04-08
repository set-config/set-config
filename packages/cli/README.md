# @set-config/cli

Universal config file CLI - set/get/delete JSON, YAML, and TOML values.

## Quick Start

```bash
# JSON
npx @set-config/cli set config.json a.b.c 123
npx @set-config/cli get config.json a.b.c

# YAML (with adapter)
npx @set-config/yaml set config.yaml server.port 8080

# TOML (with adapter)
npx @set-config/toml set config.toml database.pool 10
```

## Full CLI with all adapters

After installing adapters, `@set-config/cli` automatically supports all formats:

```bash
npx @set-config/cli set config.yaml server.port 8080
npx @set-config/cli set config.toml app.name "MyApp"
```

## Install adapters

| Format | Package |
|--------|---------|
| YAML | `npx @set-config/yaml` |
| TOML | `npx @set-config/toml` |

## Usage

```bash
npx @set-config/cli set opencode.json provider.minimax.limit.context 200000
npx @set-config/cli get opencode.json provider.minimax.limit.context
npx @set-config/cli list opencode.json provider
npx @set-config/cli append opencode.json plugins "my-plugin"
npx @set-config/cli remove opencode.json plugins "my-plugin"
npx @set-config/cli delete opencode.json provider.minimax
npx @set-config/cli init config.yaml --format yaml
npx @set-config/cli formats
```

## Value Types

| Input | Result |
|-------|--------|
| `true` | boolean `true` |
| `false` | boolean `false` |
| `null` | null |
| `123` | number `123` |
| `3.14` | number `3.14` |
| `hello` | string `"hello"` |

## License

MIT
