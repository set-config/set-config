# @set-config/cli

Universal config file CLI with JSON, YAML, TOML, ENV, and Markdown support.

## Usage

```bash
npx @set-config/cli set config.json a.b.c 123
npx @set-config/cli get config.json a.b.c
npx @set-config/cli list config.json
npx @set-config/cli append config.json tags "new-tag"
npx @set-config/cli remove config.json tags "old-tag"
npx @set-config/cli delete config.json a.b.c
npx @set-config/cli init config.yaml --format yaml
```

## No Install Required

```bash
npx @set-config/cli set opencode.json model openai/gpt-4o
```

## Value Types

| Input | Result |
|-------|--------|
| `123` | number `123` |
| `3.14` | number `3.14` |
| `true` | boolean `true` |
| `false` | boolean `false` |
| `null` | null |
| `hello` | string `"hello"` |

## License

MIT
