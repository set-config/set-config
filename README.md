# set-config

> Agent-first config file CLI — modify JSON, YAML, TOML, and ENV files with a single tool, a single read/write, and complete visibility into every config change.

## Why set-config?

AI agents constantly modify config files. Existing tools create problems:

| Tool | Problem |
|------|---------|
| `jq` | Great for reading, painful for writing — pipelines break under pressure |
| `node -e` | Inline scripts are invisible to future readers, hard to audit |
| `Python` | Not always available in the execution environment |
| `sed` / `grep` | Fragile string manipulation — breaks on special characters, edge cases |

`set-config` is built for agents: zero-install (`npx`), idempotent by design, and **batch mode** that makes every config change a single, auditable command.

## Quick Start

```bash
# One-shot: file first, ops after
npx @set-config/cli config.json --set='model=gpt-4o' --set='debug=true'
```

## Batch Mode

Read the file once, apply all changes, write once. One config declaration per flag — scan a command and know exactly what changed.

```bash
# TOML example
npx @set-config/cli ~/.codex/config.toml \
  --set='model=gpt-4o' \
  --set='model_provider=anthropic' \
  --set='approval_policy=never' \
  --merge='model_providers.anthropic={"name":"Anthropic","base_url":"https://api.anthropic.com","wire_api":"anthropic-messages"}'

# YAML example
npx @set-config/cli ~/.openclaw/config.yaml \
  --set='gateway.mode=local' \
  --set='gateway.auth.mode=token' \
  --merge='models.providers.llm={"baseUrl":"https://llm.univer.ai","models":[{"id":"claude-sonnet-4","contextWindow":200000}]}'
```

**Why batch mode?**
- **One read, one write** — no race conditions between parallel operations
- **Complete visibility** — each `--set` or `--merge` is a config declaration; audit by reading
- **Atomic** — either all changes apply or none do

## Packages

| Package | Description |
|---------|-------------|
| `@set-config/cli` | Full CLI — JSON + YAML + TOML + ENV adapters (recommended) |
| `@set-config/core` | JSON only — smallest footprint |
| `@set-config/yaml` | YAML adapter |
| `@set-config/toml` | TOML adapter |
| `@set-config/dotenv` | ENV (.env) adapter |

## Reference

```
set-config <file>
  --set='path=value'           Set value (heuristic parse: numbers, bools, JSON)
  --set-json='path=json'       Set value (strict JSON.parse, fails on invalid JSON)
  --merge='path=json'          Deep merge object at path
  --merge-json='path=json'     Deep merge object at path (strict JSON.parse)
  --append-json='path=json'    Append to array at path (strict, idempotent)
  --delete='path'              Delete key at path
```

### Rules
- Split on first `=`: left is path, right is value
- Empty path (no `=`) is the root object
- Operations execute in flag order
- All ops share one read + one write

### Examples

```bash
# Set multiple leaf values
npx @set-config/cli config.toml \
  --set='model=gpt-4o' \
  --set='timeout=30' \
  --set='debug=false'

# Merge nested objects at specific paths
npx @set-config/cli config.yaml \
  --merge='server={"port":8080,"host":"0.0.0.0"}' \
  --merge='auth={"mode":"token","secret":"'"$API_SECRET"'"}'

# ENV file — flat key=value structure
npx @set-config/cli .env \
  --set='API_KEY='"$SECRET" \
  --set='BASE_URL=https://api.example.com'

# Mix set + merge + delete in one pass
npx @set-config/cli config.json \
  --set='model=gpt-4o' \
  --merge='provider={"api_key":"sk-..."}' \
  --delete='legacy.flag'
```

## Path Syntax

- `.key` — object property
- `[n]` — array index
- Quoted keys for dots: `'provider.models."gpt-4".limit'`
- Empty path (no `=`) — operates on root object

## Idempotency

- `--set` — overwrites the value, always succeeds
- `--merge` — deep merges, preserves other keys
- `--append-json` — skips if identical object already exists
- No accidental data loss — all operations are additive unless you explicitly overwrite

## Install (optional)

```bash
npm install -g @set-config/cli
```
