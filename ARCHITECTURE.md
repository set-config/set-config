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
├── core    # CLI engine + built-in JSON adapter
├── yaml    # YAML adapter
├── toml    # TOML adapter
└── cli     # Full wrapper (depends on core + yaml + toml)
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

## Publishing

- Source directory: `prepublishOnly: exit 1` (prevents accidental publish)
- Publish from `dist/`: `npm run publish` (defined in each package)
- Build generates `dist/package.json` with resolved dependency versions

## Bin Registration

All packages register `set-config` bin. When multiple packages are globally installed, npm/pnpm will warn about duplicates but use the last-installed version - this is acceptable because all versions are compatible.

## Dependencies

```
cli → core, yaml, toml
yaml → core
toml → core
```

The `core` package contains the CLI engine and JSON adapter. Adapter packages (`yaml`, `toml`) provide additional format support and register the bin for `npx` access.
