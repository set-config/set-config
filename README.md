# set-config

> Agent-first config file CLI - simple commands for AI agents to modify config files

## Why set-config?

Agents (Claude Code, OpenCode, etc.) need to modify config files but:
- **`jq`**: Great for reading, painful for writing - requires complex pipelines
- **`node -e`**: Requires writing scripts, error handling, file management
- **`Python`**: Not always available

`set-config` provides simple commands that work via `bash` or `execute` tools.

## Quick Start

```bash
# No install required
npx @set-config/cli set config.json a.b.c 123
npx @set-config/cli get config.json a.b.c
```

## Packages

| Package | Description | Use Case |
|---------|-------------|----------|
| `@set-config/cli` | Full CLI + all adapters | Most scenarios (recommended) |
| `@set-config/core` | JSON only | Minimal/fastest |
| `@set-config/yaml` | YAML adapter only | Minimal/speed-critical |
| `@set-config/toml` | TOML adapter only | Minimal/speed-critical |

## Usage

```bash
npx @set-config/cli set config.json path.to.value 123
npx @set-config/cli get config.json path.to.value
npx @set-config/cli delete config.json path.to.value
npx @set-config/cli list config.json
npx @set-config/cli append config.json array.path "item"
npx @set-config/cli remove config.json array.path "item"
npx @set-config/cli init config.json
npx @set-config/cli formats
```

## Keys with Dots

Keys containing dots (e.g., model names like `MiniMax-M2.7-highspeed`) must be quoted:

```bash
npx @set-config/cli set config.json 'provider.minimax.models."MiniMax-M2.7-highspeed".limit.context' 200000
```

Single or double quotes work: `"key.with.dots"` or `'key.with.dots'`

## Value Types

| Input | Result |
|-------|--------|
| `123` | number `123` |
| `3.14` | number `3.14` |
| `true` | boolean `true` |
| `false` | boolean `false` |
| `null` | null |
| `hello` | string `"hello"` |
| `'{"key":"val"}'` | object `{"key": "val"}` |
| `'[1,2,3]'` | array `[1, 2, 3]` |

## For Agents

```bash
Tool: bash
Command: npx @set-config/cli set opencode.json model openai/gpt-4o
```

## Install (optional)

```bash
npm install -g @set-config/cli
# cli includes yaml and toml adapters - no extra install needed
```
