# set-config

Agent-first config file CLI for AI agents and automation.

## Why

Agents (Claude Code, OpenCode, etc.) need to modify config files but:
- **jq**: Syntax is complex for nested paths, hard to embed in prompts
- **Node.js scripts**: Require writing files, executing, error handling
- **Python**: Not always available in all environments

`set-config` is designed for agents to call via `bash` or `execute` tools with simple, memorable commands.

## Install

```bash
npm install -g @set-config/cli
```

## Optional Adapters

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

## For Agents

Agents can call this tool directly via bash/execute without writing scripts:

```
Tool: bash
Command: set-config set opencode.json model openai/gpt-4o
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
