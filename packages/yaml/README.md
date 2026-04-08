# @set-config/yaml

YAML adapter for set-config CLI.

## Usage

```bash
# Direct use
npx @set-config/yaml set config.yaml server.port 8080
npx @set-config/yaml get config.yaml server.port

# With @set-config/cli (auto-detected after adapter install)
npm install -g @set-config/yaml  # One-time install
set-config set config.yaml server.port 8080  # Works with any set-config variant
```

## License

MIT
