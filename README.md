# set-config

> Agent-first config file CLI for AI agents and automation

## Why

Agents (Claude Code, OpenCode, etc.) need to modify config files but:
- **jq**: Syntax is complex for nested paths, hard to embed in prompts
- **Node.js scripts**: Require writing files, executing, error handling
- **Python**: Not always available in all environments

`set-config` is designed for agents to call via `bash` or `execute` tools with simple, memorable commands.

## Quick Start

### Install (optional)

```bash
# Install globally for repeated use
npm install -g @set-config/cli @set-config/yaml @set-config/toml
```

### Use without installing

```bash
# Use via npx (no install required)
npx @set-config/cli set opencode.json model openai/gpt-4o
npx @set-config/cli get opencode.json model
```

## Packages

```
set-config/
├── packages/
│   ├── set-config/          # @set-config/cli - Main CLI tool
│   ├── yaml/                # @set-config/yaml - Optional YAML adapter
│   └── toml/                # @set-config/toml - Optional TOML adapter
```

### @set-config/cli

Main CLI tool with built-in JSON support.

```bash
npm install -g @set-config/cli
```

### @set-config/yaml

Optional YAML adapter. Install alongside CLI for YAML support.

```bash
npm install -g @set-config/yaml
```

### @set-config/toml

Optional TOML adapter. Install alongside CLI for TOML support.

```bash
npm install -g @set-config/toml
```

## CLI Usage

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

## For Agents

Agents can call this tool directly via bash/execute without writing scripts:

```
Tool: bash
Command: set-config set opencode.json model openai/gpt-4o
```

Or via npx without installation:

```
Tool: bash
Command: npx @set-config/cli set opencode.json model openai/gpt-4o
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

## Extending

To add support for a new format, create a new adapter package:

1. Create `@set-config/your-format` package
2. Implement `supports(filename)` and `read/write` methods
3. Export a class that the CLI can dynamically load

## License

MIT
