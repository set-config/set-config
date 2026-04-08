# @set-config/cli

Universal config file CLI - set/get/delete JSON values. Supports YAML and TOML with optional adapters.

## Install

```bash
npm install -g @set-config/cli
```

For YAML support: `npm install -g @set-config/yaml`
For TOML support: `npm install -g @set-config/toml`

Or install all at once:

```bash
npm install -g @set-config/cli @set-config/yaml @set-config/toml
```

## Use without installing

```bash
npx @set-config/cli set opencode.json model openai/gpt-4o
npx @set-config/cli get opencode.json model
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
