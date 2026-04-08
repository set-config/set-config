---
name: set-config
description: Modify config files (JSON/YAML/TOML) via shell. Use when agent needs to set, get, or delete config values.
---

Config file CLI for agents

```bash
npx @set-config/cli
# or: npm install -g @set-config/cli
```

```bash
set-config set    file.json path.to.value 123
set-config get    file.json path.to.value
set-config delete file.json path.to.value
set-config list   file.json [path]
set-config append file.json arr "item"
set-config remove file.json arr "item"
```

Value types: `123` (number), `true/false` (boolean), `null`, `"string"`

```bash
set-config set opencode.json model openai/gpt-4o
set-config get config.json database.host
set-config append config.json plugins "my-plugin"
```

Docs: [README.md](../README.md) | [AGENTS.md](../AGENTS.md)
