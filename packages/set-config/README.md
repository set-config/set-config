# set-config

Universal config file CLI - set/get/delete JSON, YAML, TOML values

## Install

```bash
npm install -g @set-config/cli
```

## Optional Adapters

By default, only JSON is supported. Install optional adapters for more formats:

```bash
npm install -g @set-config/yaml   # for .yaml, .yml files
npm install -g @set-config/toml    # for .toml files
```

## Usage

```bash
# Set a value
set-config set opencode.json provider.minimax.limit.context 200000

# Get a value
set-config get opencode.json provider.minimax.limit.context

# List content at path
set-config list opencode.json provider

# Append to array
set-config append opencode.json plugins "my-plugin"

# Remove from array
set-config remove opencode.json plugins "my-plugin"

# Delete a field
set-config delete opencode.json provider.minimax

# Initialize new file
set-config init config.yaml --format yaml

# Check supported formats
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
