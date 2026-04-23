# Markdown Adapter Design

## Overview

The markdown adapter (`@set-config/markdown`) enables AI agents to operate on Markdown documents through the same `set-config` CLI interface used for JSON, YAML, TOML, and ENV files.

**Core insight**: Markdown is a tree (MDAST), not just text. Heading hierarchy forms a natural semantic skeleton that can be addressed with paths — the same `.` and `[]` syntax used for all other formats.

## Architecture

### Parsing: micromark + mdast-util (remark's底层)

We use the remark ecosystem's底层 layer directly (not the unified pipeline):

```
markdown string
  → micromark (+ micromark-extension-frontmatter, micromark-extension-gfm)
    → mdast-util-from-markdown (+ frontmatter/gfm mdast extensions)
      → MDAST (Markdown Abstract Syntax Tree)
```

Serialization reverses the pipeline:

```
MDAST
  → mdast-util-to-markdown (+ frontmatter/gfm extensions)
    → markdown string
```

**Why not remark/unified?** The unified pipeline adds unnecessary abstraction. micromark + mdast-util are the actual parsing/serializing engines — lighter, faster, and sufficient for our use case.

### Section Model

Headings define the document's semantic structure. We build a **section tree** from flat MDAST children:

```markdown
# Guide                        ← section: Guide (H1)
Intro paragraph...               ← Guide.blocks
## Install                     ← section: Guide.Install (H2)
```bash
npm install
```                            ← Guide.Install.blocks
## Configure                  ← section: Guide.Configure (H2)
| Key | Value |                ← Guide.Configure.blocks
# API                          ← section: API (H1)
### Auth                       ← section: API.Auth (H3)
```

A **section** = one heading + all content blocks until the next heading of equal or higher depth.

### Frontmatter Reuse

Frontmatter is YAML. The markdown adapter reuses `@set-config/yaml`'s `parseYaml`/`stringifyYaml` functions — no duplicate YAML parsing logic.

## Path Syntax

Uses the same `.` and `[]` delimiters as all other set-config formats. No tokenizer changes needed.

### Section Addressing (primary)

```
Guide                        → top-level section (H1)
Guide.Install                → nested section (H2 under H1)
Guide."Getting Started"      → heading with spaces (quoted)
Guide.Deploy                → non-existent → creates new section
```

**Resolution**: greedy heading match. Each token first tries to match a child heading by text. If no match, falls through to block type matching.

### Block Addressing

```
Guide.code[0]                → first code block in section
Guide.table[0]               → first table in section
Guide.list[0]                → first list in section
Guide.list[0][1]             → second item of first list
```

### Frontmatter Addressing

```
$frontmatter                 → entire frontmatter object
$frontmatter.title           → specific key
$frontmatter.author.name     → nested key (dot notation)
```

The `$` prefix separates the metadata layer from the content layer, avoiding conflicts with headings named "frontmatter".

### Root

Empty path operates on the entire document:

```
set-config doc.md set '' '# New Content'
```

## Operations

All operations reuse existing set-config semantics. No new CLI flags.

### set — Create or Replace

```bash
# Replace section content (heading preserved, blocks replaced)
set-config doc.md set 'Guide.Install' 'New install instructions...'

# Replace with markdown containing a heading → auto-update heading text
set-config doc.md set 'Guide.Install' '## Setup Guide\nNew instructions...'

# Create new section (set to non-existent path → appended to parent)
set-config doc.md set 'Guide.Deploy' 'Deploy to production:\n```bash\nnpm run deploy\n```'

# Create top-level section
set-config doc.md set 'Changelog' 'Version history.'

# Frontmatter
set-config doc.md set '$frontmatter.title' 'New Title'
set-config doc.md set '$frontmatter.tags' '["a","b","c"]'
```

### get — Read

```bash
set-config doc.md get 'Guide.Install'           → section content (markdown string)
set-config doc.md get 'Guide.code[0]'           → code block AST node
set-config doc.md get '$frontmatter.title'      → 'New Title'
```

### delete — Remove

```bash
# Delete section (heading + all content + all sub-sections)
set-config doc.md delete 'Guide.Legacy'

# Delete frontmatter key
set-config doc.md delete '$frontmatter.draft'
```

### batch mode (recommended)

```bash
set-config doc.md \
  --set='$frontmatter.title=My Doc' \
  --set='Guide.Install=安装步骤...' \
  --delete='Guide.Legacy' \
  --set='Guide.code[0]=new code'
```

Single read → all mutations → single write.

## Disambiguation

### Unique headings — direct use

```markdown
# Guide
## Install
## Configure
# API
```

```
Install              → unique, resolves to Guide.Install
API                  → unique
```

### Non-unique headings — full path

```markdown
# Frontend Guide
## Install
# Backend Guide
## Install
```

```
Install              → ambiguous
Frontend Guide.Install  → unique
Backend Guide.Install   → unique
```

### Duplicate headings at same level — index fallback

```markdown
# Changelog
## v1.0
## v1.0
```

```
Changelog.v1.0[0]    → first
Changelog.v1.0[1]    → second
```

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Separator | `.` | Zero tokenizer changes. Unified mental model with JSON/YAML. |
| Semantic anchor | Heading text | Only stable, rich, universal semantic structure in Markdown. |
| Index role | Fallback | Semantic paths are primary; index for disambiguation only. |
| AST engine | micromark + mdast-util | Bottom layer of remark — lighter, no unified overhead. |
| Frontmatter parsing | Reuse `@set-config/yaml` | No duplicate YAML logic. |
| New CLI flags | None | `set` to non-existent path = create. Existing ops suffice. |
| Round-trip fidelity | Best-effort | mdast-util-to-markdown normalizes some formatting. Content correctness > format preservation. |
| Not in cli package | Standalone adapter | `npx @set-config/markdown` works independently. Users install separately. |

## Package Structure

```
@set-config/markdown/
├── src/
│   ├── index.ts          # MarkdownAdapter class + public API
│   ├── parser.ts         # parse/serialize (micromark + mdast-util), section tree, text extraction
│   ├── resolver.ts       # semantic path parsing, resolution, mutations
│   └── deps.d.ts         # type declarations for @set-config/core and @set-config/yaml
├── tests/
│   └── markdown.test.ts  # 147 tests: parser, serializer, sections, paths, mutations, adapter
├── scripts/
│   └── build.ts          # vite build + bin generation
└── package.json
```

## Dependencies

```
@set-config/markdown
├── @set-config/core       → tokenizeKeyPath, ConfigAdapter base
├── @set-config/yaml       → parseYaml, stringifyYaml (frontmatter reuse)
├── micromark              → markdown parser
├── micromark-extension-frontmatter → YAML frontmatter support
├── micromark-extension-gfm → GFM (tables, task lists, strikethrough)
├── mdast-util-from-markdown → micromark → MDAST
├── mdast-util-to-markdown   → MDAST → markdown string
├── mdast-util-frontmatter   → frontmatter MDAST nodes
└── mdast-util-gfm           → GFM MDAST nodes
```

## Core Refactoring

To support markdown (and future adapters) as library consumers, `@set-config/core` was refactored:

```
core/src/
├── lib.ts      → Library entry: exports tokenizeKeyPath, ConfigAdapter, adapter loader
├── index.ts    → Re-exports lib.ts (main entry for `import('@set-config/core')`)
└── cli.ts      → CLI entry (main entry for `import('@set-config/core/cli')`)
```

All adapter bins now use `import('@set-config/core/cli')` instead of `import('@set-config/core')`, keeping library imports clean.
