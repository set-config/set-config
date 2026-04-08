# @set-config/toml

TOML adapter for set-config CLI.

## Usage

```bash
# Direct use
npx @set-config/toml set config.toml database.pool 10
npx @set-config/toml get config.toml database.pool

# With @set-config/cli (auto-detected after adapter install)
npm install -g @set-config/toml  # One-time install
set-config set config.toml database.pool 10  # Works with any set-config variant
```

## License

MIT
