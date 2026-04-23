# @set-config/markdown

Markdown adapter for set-config CLI.

Operates on Markdown documents via **semantic section paths** based on heading hierarchy.

## Usage

```bash
# Read a section
set-config doc.md get 'Guide.Install'

# Set (replace) a section's content
set-config doc.md set 'Guide.Install' 'New install instructions...'

# Create a new section (set to a non-existent path)
set-config doc.md set 'Guide.Deployment' 'Deploy to production...'

# Delete a section
set-config doc.md delete 'Guide.Legacy'

# List all section paths
set-config doc.md list

# Frontmatter (prefixed with $)
set-config notes.md set '$frontmatter.title' 'New Title'
set-config notes.md set '$frontmatter.tags' '["a","b"]'
set-config notes.md get '$frontmatter.status'

# Batch mode (recommended)
set-config doc.md \
  --set='$frontmatter.title=My Doc' \
  --set='Guide.Install=安装步骤...' \
  --delete='Guide.Legacy'
```

## Path Syntax

- `Guide` — top-level section (H1)
- `Guide.Install` — nested section (H2 under H1)
- `Guide."Getting Started"` — heading with spaces (quoted)
- `Guide.code[0]` — first code block in section
- `Guide.table[0]` — first table in section
- `Guide.list[0]` — first list in section
- `$frontmatter.title` — frontmatter field
- `` (empty) — root (entire document)

## License

MIT
