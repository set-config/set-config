# set-config

Universal config file CLI - set/get/delete JSON, YAML, TOML values

## Install

```bash
# Core (JSON only)
npm install -g @set-config/cli

# Optional: add YAML support
npm install -g @set-config/yaml

# Optional: add TOML support
npm install -g @set-config/toml
```

## Usage

```bash
set-config set opencode.json provider.minimax.limit.context 200000
set-config get opencode.json provider.minimax.limit.context
set-config list opencode.json provider
set-config init config.yaml --format yaml
```

## Architecture

```
@set-config/cli        # Main CLI tool
└── @set-config/yaml  # Optional YAML adapter
└── @set-config/toml  # Optional TOML adapter
```

## License

MIT
