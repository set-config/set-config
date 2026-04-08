# Architecture

## Overview

set-config is an agent-first config file CLI designed for AI agents to modify configuration files via shell tools.

## Design Principles

1. **Agent-friendly**: Simple, memorable commands easy to embed in prompts
2. **Zero-install option**: `npx @set-config/<package>` works without global install
3. **Modular adapters**: Format support via optional adapter packages

## Package Structure

```
@set-config/
├── core    # Engine + JSON adapter + CLI bin
├── yaml    # YAML adapter + CLI bin
├── toml    # TOML adapter + CLI bin
└── cli     # Full wrapper + CLI bin (depends on core + yaml + toml)
```

## Why Multiple Packages?

### Adapter Packages Register bin

Each adapter package (`yaml`, `toml`) registers the `set-config` bin. This is **intentional** and required for `npx` to work without global install:

```bash
# Without any install, this works because @set-config/yaml registers set-config bin
npx @set-config/yaml set config.yaml a.b.c 123

# After one-time adapter install, any set-config variant works
npm install -g @set-config/yaml
set-config set config.yaml a.b.c 123
```

### Global Install vs npx

| Method | Command | Use Case |
|--------|---------|----------|
| npx (recommended) | `npx @set-config/cli set config.json a 123` | No install, always latest |
| Global install | `npm install -g @set-config/cli` | Repeated use, offline |

**Note:** `cli` includes yaml and toml adapters, so `npm install -g @set-config/cli` is sufficient for all formats.

## Publishing

- Source directory: `prepublishOnly: exit 1` (prevents accidental publish)
- Publish from `dist/`: `npm run publish` (defined in each package)
- Build generates `dist/package.json` with resolved dependency versions

## Bin Registration

All four packages (`core`, `yaml`, `toml`, `cli`) register the `set-config` bin.

When multiple packages are globally installed, npm/pnpm may warn about duplicate bins but use the last-installed version - this is acceptable because all versions are compatible.

## Dependencies

```
cli → core, yaml, toml
yaml → core
toml → core
```

**Note:** `core` is the engine (adapter loader + JSON support) and exposes a CLI bin for minimal JSON-only usage. `cli` bundles all adapters for full functionality.

## Path Tokenizer Design

### Problem

Config keys may contain dots (e.g., model names like `MiniMax-M2.7-highspeed`). Using `split('.')` cannot distinguish between:
- `a.b.c` → keys `["a", "b", "c"]`
- `a."b.c".d` → keys `["a", "b.c", "d"]`

### Solution: State Machine Tokenizer

The `tokenizeKeyPath()` function uses a simple state machine to parse paths:

```
State transitions:
  DEFAULT  → (quote)    → QUOTED
  QUOTED   → (quote)    → DEFAULT
  QUOTED   → (backslash) → ESCAPED
  ESCAPED  → (any)      → QUOTED

Characters inside quotes (including dots) are preserved as-is.
```

### Examples

| Path | Tokens |
|------|--------|
| `a.b.c` | `["a", "b", "c"]` |
| `a."b.c".d` | `["a", "b.c", "d"]` |
| `a.'b.c'.d` | `["a", "b.c", "d"]` |
| `provider.models."MiniMax-M2.7-highspeed".limit` | `["provider", "models", "MiniMax-M2.7-highspeed", "limit"]` |

### Implementation

All path manipulation functions (`getNested`, `setNested`, `deleteNested`, `appendNested`, `removeNested`) use `tokenizeKeyPath()` instead of `split('.')`.
