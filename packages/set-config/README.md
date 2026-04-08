# @set-config/cli

Universal config file CLI - set/get/delete JSON, YAML, TOML values

## Install

```bash
npm install -g @set-config/cli

# Optional: add more formats
npm install -g @set-config/yaml
npm install -g @set-config/toml
```

## Usage

```bash
set-config set opencode.json provider.minimax.limit.context 200000
set-config get opencode.json provider.minimax.limit.context
set-config list opencode.json provider
set-config append opencode.json plugins "my-plugin"
set-config remove opencode.json plugins "my-plugin"
set-config delete opencode.json provider.minimax
set-config init config.yaml --format yaml
set-config formats
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
