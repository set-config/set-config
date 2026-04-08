# set-config

> Agent-first config file CLI - simple commands for AI agents to modify config files

## Why set-config?

Agents (Claude Code, OpenCode, etc.) need to modify config files but:
- **`jq`**: Syntax is complex for nested paths, hard to embed in prompts
- **`node -e`**: Requires writing scripts, error handling, file management
- **`Python`**: Not always available

`set-config` provides simple, memorable commands that work via `bash` or `execute` tools.

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
