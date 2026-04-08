# AGENTS.md

> Intent index for AI agents - how to use set-config in agent workflows

## Why set-config?

Agents (Claude Code, OpenCode, etc.) need to modify config files but:
- **`jq`**: Syntax is complex for nested paths, hard to embed in prompts
- **`node -e`**: Requires writing scripts, error handling, file management
- **`Python`**: Not always available in all environments

`set-config` provides simple, memorable commands that work via `bash` or `execute` tools.

## Core Commands

```bash
# Set a value (creates path if needed)
npx @set-config/cli set config.json database.host localhost

# Get a value
npx @set-config/cli get config.json database.host

# Delete a key
npx @set-config/cli delete config.json database.host

# List keys at path
npx @set-config/cli list config.json database

# Array operations
npx @set-config/cli append config.json plugins "my-plugin"
npx @set-config/cli remove config.json plugins "unused-plugin"
```

## Usage Patterns

### Pattern 1: Direct npx (no install)

```bash
Tool: bash
Command: npx @set-config/cli set opencode.json model openai/gpt-4o
```

### Pattern 2: Global install for repeated use

```bash
npm install -g @set-config/cli @set-config/yaml @set-config/toml
# Then use: set-config set config.json ...
```

### Pattern 3: Format-specific packages

```bash
# YAML only
npx @set-config/yaml set config.yaml server.port 8080

# TOML only
npx @set-config/toml set config.toml database.pool 10
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

## Architecture

- `cli` - Full wrapper with JSON + YAML + TOML support
- `yaml` - YAML adapter (for `npx @set-config/yaml`)
- `toml` - TOML adapter (for `npx @set-config/toml`)
- `core` - Engine only (not directly used by agents)

## Why Multiple Packages?

Each adapter package (`yaml`, `toml`) registers the `set-config` bin. This allows `npx @set-config/yaml` to work without any installation - the bin is bundled in the package itself.

When you run `npx @set-config/cli`, it automatically downloads YAML/TOML adapters if needed.

## Error Handling

```bash
# File doesn't exist - auto-creates
npx @set-config/cli set newfile.json a.b.c 123  # ✓ Creates newfile.json

# Path doesn't exist - auto-creates
npx @set-config/cli set config.json new.path.value 123  # ✓ Creates path

# Invalid format - clear error
npx @set-config/core set file.yaml ...  # ✗ Error: YAML not supported
```

## For Tool Definitions

```json
{
  "name": "set-config",
  "description": "Set a config value in JSON/YAML/TOML file",
  "input_schema": {
    "type": "object",
    "properties": {
      "file": { "type": "string", "description": "Config file path" },
      "path": { "type": "string", "description": "Dot-separated path" },
      "value": { "type": "string", "description": "Value to set" }
    }
  }
}
```

Usage: `set-config set opencode.json model openai/gpt-4o`
