# set-config

> Agent-first config file CLI - designed for AI agents to modify config files via shell tools

**Why not `node -e` or `jq`?** Agents need simple, memorable commands that are easy to embed in prompts - `jq` syntax is complex for nested paths, Node.js scripts require error handling, Python isn't always available.

## No Install Required

```bash
npx @set-config/cli set opencode.json model openai/gpt-4o
npx @set-config/cli get opencode.json model
```

## Install (for repeated use)

```bash
npm install -g @set-config/cli @set-config/yaml @set-config/toml
```

## Packages

| Package | Description | CLI |
|---------|-------------|-----|
| `@set-config/cli` | Full CLI + all adapters | `npx @set-config/cli` |
| `@set-config/yaml` | YAML adapter | `npx @set-config/yaml` |
| `@set-config/toml` | TOML adapter | `npx @set-config/toml` |
| `@set-config/core` | Engine only (no CLI) | - |

## Usage

```bash
# Set, get, delete values
npx @set-config/cli set config.json a.b.c 123
npx @set-config/cli get config.json a.b.c
npx @set-config/cli delete config.json a.b.c

# List, append, remove
npx @set-config/cli list config.json a
npx @set-config/cli append config.json tags "new-tag"
npx @set-config/cli remove config.json tags "old-tag"

# Initialize new files
npx @set-config/cli init config.yaml --format yaml
```

## For Agents

Designed for agents using bash/execute tools - simple commands that work without writing scripts:

```
Tool: bash
Command: npx @set-config/cli set opencode.json model openai/gpt-4o
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
