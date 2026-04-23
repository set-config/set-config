# @set-config/dotenv

ENV (.env) adapter for set-config CLI.

## Usage

```bash
# Direct use
npx @set-config/dotenv set .env API_KEY sk-xxx
npx @set-config/dotenv get .env API_KEY

# With @set-config/cli (auto-detected after adapter install)
npm install -g @set-config/dotenv  # One-time install
set-config set .env API_KEY sk-xxx  # Works with any set-config variant
```

## License

MIT
