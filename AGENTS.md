# AGENTS.md - Maintainer Intent Index

> This file is a guide for maintainers - what the project is, where things are, and how to work with it.

## Project Overview

Universal config file CLI for AI agents. Simple commands to set/get/delete JSON, YAML, TOML values.

**Key insight**: Agents need zero-install usage (`npx`) and simple commands. Complex tooling is a barrier.

## Tech Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript
- **Bundler**: rolldown-vite
- **Package Manager**: pnpm
- **Testing**: vitest

## Project Structure

```
set-config/
├── packages/
│   ├── core/          # Engine + adapter loader + JSON adapter
│   ├── dotenv/        # ENV (.env) adapter
│   ├── yaml/          # YAML adapter
│   ├── toml/          # TOML adapter
│   └── cli/           # Full wrapper (bundles all adapters)
├── integration/       # Integration tests (vitest)
├── ARCHITECTURE.md   # Technical architecture details
├── AGENTS.md         # This file
└── README.md         # User-facing quick start
```

## Design Rules

### 1. Zero-Install First
Every package that provides format support MUST expose a CLI bin so `npx @set-config/<package>` works without installation.

### 2. Publish from dist/
Source directories have `prepublishOnly: exit 1` to prevent accidental publishes. Build scripts generate `dist/` with resolved dependency versions. Publish from `dist/`.

### 3. Adapter Pattern
Format support is provided via adapter packages. The core engine dynamically loads adapters at runtime via `import()`.

### 4. Semantic Versions
All packages share the same version number to avoid confusion.

## Publishing Workflow

```bash
# 1. Update versions in all packages
# packages/*/package.json: version: x.y.z

# 2. Build all packages
pnpm build

# 3. Publish from dist/
cd packages/core && npm run publish
cd packages/dotenv && npm run publish
cd packages/yaml && npm run publish
cd packages/toml && npm run publish
cd packages/cli && npm run publish

# 4. Run integration tests
CI=true pnpm test:integration
```

## Integration Tests

Located in `integration/publish.test.ts`. Tests verify that published npm packages work correctly via npx.

**Skip by default** - requires `CI=true` and network access:
```bash
CI=true pnpm test:integration
```

## Architecture Decisions

### Why Multiple Packages?
- `npx @set-config/yaml` must work without global install
- Each adapter package bundles the `set-config` bin
- `cli` is a convenience wrapper that depends on all adapters

### Why rolldown-vite?
- Fast bundling
- ESM-first output
- Works well with TypeScript

### Why Dynamic Import for Adapters?
Allows optional dependencies. If yaml adapter isn't installed, core still works for JSON. Error messages guide users to install the needed adapter.

## CLI

### Batch mode (recommended for provision scripts)

File first, ops after. Single read + single write.

```
set-config <file>
  --set='path=value'           Set value (heuristic parse)
  --set-json='path=json'       Set value (strict JSON.parse)
  --merge='path=json'          Deep merge object at path
  --merge-json='path=json'     Deep merge object at path (strict JSON.parse)
  --append-json='path=json'    Append to array at path (strict, idempotent)
  --delete='path'              Delete key at path
```

Split on first `=`: left is path, right is value. Empty path = root. Ops execute in flag order.

### Subcommand mode (single-operation, for interactive use)

```
set-config set [--json] <file> [path] <value>
set-config get <file> [path]
set-config delete <file> <path>
set-config list <file> [path]
set-config append [--json] <file> <path> <value>
set-config remove <file> <path> <value>
set-config merge [--json] <file> [path] <value>
set-config init <file> [--format]
set-config formats
```

### Path syntax (all modes)
- `.key` — object property
- `[n]` — array index
- Mixed: `items[0].name`, `provider.models."model-2.7".limit`
- Empty path `''` — operates on root (replace for `set`, merge for `merge`)

## For More Details

- [ARCHITECTURE.md](ARCHITECTURE.md) - Technical deep dive
- [README.md](README.md) - User quick start
- Source code in `packages/*/src/`
