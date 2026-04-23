# set-config

> Config changes should be readable, not reverse-engineered.
> Built for agents: `npx`, idempotent, batch.

[![npm version](https://img.shields.io/npm/v/@set-config/core?style=flat-square)](https://www.npmjs.com/package/@set-config/core)
[![npm version](https://img.shields.io/npm/v/@set-config/yaml?style=flat-square&label=yaml)](https://www.npmjs.com/package/@set-config/yaml)
[![npm version](https://img.shields.io/npm/v/@set-config/toml?style=flat-square&label=toml)](https://www.npmjs.com/package/@set-config/toml)
[![npm version](https://img.shields.io/npm/v/@set-config/dotenv?style=flat-square&label=dotenv)](https://www.npmjs.com/package/@set-config/dotenv)
[![npm version](https://img.shields.io/npm/v/@set-config/markdown?style=flat-square&label=markdown)](https://www.npmjs.com/package/@set-config/markdown)
[![npm version](https://img.shields.io/npm/v/@set-config/cli?style=flat-square&label=cli)](https://www.npmjs.com/package/@set-config/cli)

## Quick Start

```bash
npx @set-config/core config.json --set='model=gpt-4o' --set='debug=true'
```

## Packages

Install only what you need. Each package includes the engine — no shared dependencies.

| Package | Format | Size |
|---------|--------|------|
| `@set-config/core` | JSON | 17 KB |
| `@set-config/yaml` | YAML | 158 KB |
| `@set-config/toml` | TOML | 72 KB |
| `@set-config/dotenv` | .env | 21 KB |
| `@set-config/markdown` | Markdown | 217 KB |
| `@set-config/cli` | All above | 217 KB |

## Why set-config?

We maintain hundreds of provisioning scripts that write config files. Each format has its own editing tool, but none of them work when called from shell scripts:

```bash
# What we had: YAML config written as a printf template inside YAML
printf 'claude-api-key:\n  - api-key: %s\n    base-url: %s\n    models:\n      - name: %s\n        alias: %s\n    cloak:\n      mode: auto\n' \
  "$API_KEY" "$BASE_URL" "$MODEL" "$ALIAS" >> config.yaml

# What we had: JSON config written as inline JS inside YAML
node -e "
  const fs = require('fs');
  const s = JSON.parse(fs.readFileSync(f, 'utf8'));
  s.model = model;
  s.env = s.env || {};
  s.env.ANTHROPIC_BASE_URL = baseUrl;
  fs.writeFileSync(f, JSON.stringify(s, null, 2));
" settings.json "$MODEL" "$URL"

# What we had: env file written with grep/sed conditional logic (14 lines)
grep -q '^API_KEY=' .env && sed -i 's|^API_KEY=.*|...|' .env || echo "API_KEY=..." >> .env
```

These all work, but nobody can read them. You have to mentally parse printf format strings, shell variable expansion, and JavaScript to understand what config a provision step writes.

```bash
# What we have now
set-config config.yaml \
  --merge='claude-api-key=[{"api-key":"'"$API_KEY"'","base-url":"'"$BASE_URL"'","models":[{"name":"'"$MODEL"'","alias":"'"$ALIAS"'"}],"cloak":{"mode":"auto"}}]'

set-config settings.json \
  --set='model="'"$MODEL"'"' \
  --merge='env={"ANTHROPIC_BASE_URL":"'"$URL"'"}'

set-config .env \
  --set='API_KEY='"$API_KEY" \
  --set='BASE_URL='"$BASE_URL"
```

Same result. But you can **see the config structure in the command itself**. No printf, no inline JS, no grep/sed.

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

## Reference

```
set-config <file>
  --set='path=value'           Set value (heuristic parse: numbers, bools, JSON)
  --set-json='path=json'       Set value (strict JSON.parse, fails on invalid JSON)
  --merge='path=json'          Deep merge object at path
  --merge-json='path=json'     Deep merge object at path (strict JSON.parse)
  --append-json='path=json'    Append to array at path (strict, idempotent)
  --delete='path'              Delete key at path
  --lock                       Acquire file lock before write (default: off)
  --lock-timeout=<ms>          Max wait time for lock (default: 30000)
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

## Concurrency

Multiple agents writing the same config file simultaneously can lose data (last-write-wins). Add `--lock` to queue concurrent writes:

```bash
# Two agents provisioning the same file at the same time — no data loss
set-config config.yaml --lock --set='gateway.mode=local'
set-config config.yaml --lock --set='gateway.auth.mode=token'
```

When `--lock` is active, processes targeting the same file wait in queue. The lock is released automatically when the write completes or the process exits. Stale locks (owner process died) are automatically detected and cleaned up.

## Install (optional)

```bash
# Pick the formats you need
npm install -g @set-config/core @set-config/yaml

# Or everything
npm install -g @set-config/cli
```
