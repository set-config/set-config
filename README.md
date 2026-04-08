# set-config

> Agent-first config file CLI - designed for AI agents to modify config files via shell tools

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

## Install (optional)

```bash
npm install -g @set-config/cli
# cli includes yaml and toml adapters - no extra install needed
```

## For Agents

See [AGENTS.md](AGENTS.md) for agent-specific documentation.
