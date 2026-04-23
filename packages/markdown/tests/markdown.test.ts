import { describe, it, expect } from 'vitest';
import { MarkdownAdapter } from '../src/index.js';
import { parseMarkdown, serializeMarkdown, buildSections, extractText, extractHeadingText } from '../src/parser.js';
import { parseSemanticPath, resolvePath, applyMutations } from '../src/resolver.js';
import type { Section } from '../src/parser.js';

// ─── Fixtures ───

const SAMPLE_DOC = `---
title: My Project
version: 1.0.0
---

# Guide

Introduction paragraph.

## Install

Run the following command:

\`\`\`bash
npm install -g my-cli
\`\`\`

## Configure

| Key | Default | Description |
|-----|---------|-------------|
| port | 3000 | Server port |
| host | localhost | Server host |

## Getting Started

Follow these steps:

- Read the docs
- Try the examples
- [x] Setup complete
- [ ] Write tests

# API

API documentation here.

### Authentication

Token-based auth.
`;

const NO_FM_DOC = `# Hello

Some content.
`;

// ─── Parser tests ───

describe('parseMarkdown', () => {
  it('should parse frontmatter', () => {
    const root = parseMarkdown(SAMPLE_DOC);
    const yaml = root.children.find(n => n.type === 'yaml');
    expect(yaml).toBeDefined();
    expect(yaml!.type).toBe('yaml');
    expect(yaml!.value).toContain('title: My Project');
  });

  it('should parse headings', () => {
    const root = parseMarkdown(SAMPLE_DOC);
    const headings = root.children.filter(n => n.type === 'heading');
    expect(headings.length).toBe(6);
    expect(headings[0]).toMatchObject({ type: 'heading', depth: 1 });
  });

  it('should parse code blocks', () => {
    const root = parseMarkdown(SAMPLE_DOC);
    const codes = root.children.filter(n => n.type === 'code');
    expect(codes.length).toBe(1);
    expect(codes[0]).toMatchObject({ type: 'code', lang: 'bash' });
    expect(codes[0].value).toContain('npm install');
  });

  it('should parse tables', () => {
    const root = parseMarkdown(SAMPLE_DOC);
    const tables = root.children.filter(n => n.type === 'table');
    expect(tables.length).toBe(1);
    expect(tables[0].children.length).toBe(3); // header + 2 rows
  });

  it('should parse lists with task items', () => {
    const root = parseMarkdown(SAMPLE_DOC);
    const lists = root.children.filter(n => n.type === 'list');
    expect(lists.length).toBe(1);
    const items = lists[0].children;
    expect(items.length).toBe(4);
    expect(items[2].checked).toBe(true);
    expect(items[3].checked).toBe(false);
  });

  it('should handle document without frontmatter', () => {
    const root = parseMarkdown(NO_FM_DOC);
    expect(root.children.some(n => n.type === 'yaml')).toBe(false);
    expect(root.children.some(n => n.type === 'heading')).toBe(true);
  });
});

// ─── Serialize round-trip ───

describe('serializeMarkdown round-trip', () => {
  it('should round-trip with frontmatter', () => {
    const root = parseMarkdown(SAMPLE_DOC);
    const output = serializeMarkdown(root);
    const reparsed = parseMarkdown(output);
    const headings = reparsed.children.filter(n => n.type === 'heading');
    expect(headings.length).toBe(6);
  });

  it('should preserve frontmatter content', () => {
    const root = parseMarkdown(SAMPLE_DOC);
    const output = serializeMarkdown(root);
    expect(output).toContain('title: My Project');
    expect(output).toContain('version: 1.0.0');
  });

  it('should preserve code blocks', () => {
    const root = parseMarkdown(SAMPLE_DOC);
    const output = serializeMarkdown(root);
    expect(output).toContain('npm install -g my-cli');
  });

  it('should preserve task list items', () => {
    const root = parseMarkdown(SAMPLE_DOC);
    const output = serializeMarkdown(root);
    expect(output).toContain('[x]');
    expect(output).toContain('[ ]');
  });
});

// ─── Section building ───

describe('buildSections', () => {
  it('should build correct section tree', () => {
    const root = parseMarkdown(SAMPLE_DOC);
    const { sections, rootBlocks } = buildSections(root);

    // rootBlocks: just frontmatter
    expect(rootBlocks.length).toBe(1);
    expect(rootBlocks[0].type).toBe('yaml');

    // Top-level sections: Guide, API
    expect(sections.length).toBe(2);
    expect(sections[0].heading.text).toBe('Guide');
    expect(sections[1].heading.text).toBe('API');

    // Guide's children: Install, Configure, Getting Started
    expect(sections[0].children.length).toBe(3);
    expect(sections[0].children[0].heading.text).toBe('Install');
    expect(sections[0].children[1].heading.text).toBe('Configure');
    expect(sections[0].children[2].heading.text).toBe('Getting Started');

    // API's children: Authentication
    expect(sections[1].children.length).toBe(1);
    expect(sections[1].children[0].heading.text).toBe('Authentication');
  });

  it('should assign blocks to correct sections', () => {
    const root = parseMarkdown(SAMPLE_DOC);
    const { sections } = buildSections(root);

    // Install section has a code block
    const install = sections[0].children[0];
    expect(install.blocks.some(b => b.type === 'code')).toBe(true);

    // Configure section has a table
    const configure = sections[0].children[1];
    expect(configure.blocks.some(b => b.type === 'table')).toBe(true);

    // Getting Started section has a list
    const gettingStarted = sections[0].children[2];
    expect(gettingStarted.blocks.some(b => b.type === 'list')).toBe(true);
  });
});

// ─── Text extraction ───

describe('extractText', () => {
  it('should extract plain text from heading', () => {
    const root = parseMarkdown('# **Bold** and *italic* heading');
    const heading = root.children.find(n => n.type === 'heading')!;
    expect(extractHeadingText(heading)).toBe('Bold and italic heading');
  });

  it('should extract plain text from heading with link', () => {
    const root = parseMarkdown('# See [the docs](https://example.com)');
    const heading = root.children.find(n => n.type === 'heading')!;
    expect(extractHeadingText(heading)).toBe('See the docs');
  });
});

// ─── Semantic path parsing ───

describe('parseSemanticPath', () => {
  it('should parse empty path', () => {
    expect(parseSemanticPath('')).toEqual([]);
    expect(parseSemanticPath('')).toEqual([]);
  });

  it('should parse $frontmatter', () => {
    const result = parseSemanticPath('$frontmatter');
    expect(result).toEqual([{ kind: 'frontmatter', key: '' }]);
  });

  it('should parse $frontmatter with key', () => {
    const result = parseSemanticPath('$frontmatter.title');
    expect(result).toEqual([{ kind: 'frontmatter', key: 'title' }]);
  });

  it('should parse $frontmatter with nested key', () => {
    const result = parseSemanticPath('$frontmatter.author.name');
    expect(result).toEqual([{ kind: 'frontmatter', key: 'author.name' }]);
  });

  it('should parse heading path', () => {
    const result = parseSemanticPath('Guide.Install');
    expect(result).toEqual([
      { kind: 'heading', text: 'Guide' },
      { kind: 'heading', text: 'Install' },
    ]);
  });

  it('should parse heading with spaces (quoted)', () => {
    const result = parseSemanticPath('Guide."Getting Started"');
    expect(result).toEqual([
      { kind: 'heading', text: 'Guide' },
      { kind: 'heading', text: 'Getting Started' },
    ]);
  });

  it('should parse block type with index', () => {
    const result = parseSemanticPath('Guide.Install.code[0]');
    expect(result).toEqual([
      { kind: 'heading', text: 'Guide' },
      { kind: 'heading', text: 'Install' },
      { kind: 'block', blockType: 'code', index: 0 },
    ]);
  });

  it('should parse list item access', () => {
    const result = parseSemanticPath('Guide."Getting Started".list[0][1]');
    expect(result).toEqual([
      { kind: 'heading', text: 'Guide' },
      { kind: 'heading', text: 'Getting Started' },
      { kind: 'block', blockType: 'list', index: 0 },
      { kind: 'listItem', index: 1 },
    ]);
  });

  it('should parse table access', () => {
    const result = parseSemanticPath('Guide.Configure.table[0]');
    expect(result).toEqual([
      { kind: 'heading', text: 'Guide' },
      { kind: 'heading', text: 'Configure' },
      { kind: 'block', blockType: 'table', index: 0 },
    ]);
  });
});

// ─── Path resolution ───

describe('resolvePath', () => {
  it('should resolve root (empty path)', () => {
    const root = parseMarkdown(SAMPLE_DOC);
    const result = resolvePath(root, '');
    expect(result.found).toBe(true);
    expect(result.type).toBe('root');
  });

  it('should resolve top-level section', () => {
    const root = parseMarkdown(SAMPLE_DOC);
    const result = resolvePath(root, 'Guide');
    expect(result.found).toBe(true);
    expect(result.type).toBe('section');
    const section = result.value as Section;
    expect(section.heading.text).toBe('Guide');
  });

  it('should resolve nested section', () => {
    const root = parseMarkdown(SAMPLE_DOC);
    const result = resolvePath(root, 'Guide.Install');
    expect(result.found).toBe(true);
    expect(result.type).toBe('section');
    const section = result.value as Section;
    expect(section.heading.text).toBe('Install');
    expect(section.heading.depth).toBe(2);
  });

  it('should resolve section with spaces', () => {
    const root = parseMarkdown(SAMPLE_DOC);
    const result = resolvePath(root, 'Guide."Getting Started"');
    expect(result.found).toBe(true);
    const section = result.value as Section;
    expect(section.heading.text).toBe('Getting Started');
  });

  it('should resolve deeply nested section', () => {
    const root = parseMarkdown(SAMPLE_DOC);
    const result = resolvePath(root, 'API.Authentication');
    expect(result.found).toBe(true);
    const section = result.value as Section;
    expect(section.heading.text).toBe('Authentication');
    expect(section.heading.depth).toBe(3);
  });

  it('should resolve code block', () => {
    const root = parseMarkdown(SAMPLE_DOC);
    const result = resolvePath(root, 'Guide.Install.code[0]');
    expect(result.found).toBe(true);
    expect(result.type).toBe('block');
    expect((result.value as any).type).toBe('code');
    expect((result.value as any).lang).toBe('bash');
  });

  it('should resolve table', () => {
    const root = parseMarkdown(SAMPLE_DOC);
    const result = resolvePath(root, 'Guide.Configure.table[0]');
    expect(result.found).toBe(true);
    expect(result.type).toBe('block');
    expect((result.value as any).type).toBe('table');
  });

  it('should resolve list', () => {
    const root = parseMarkdown(SAMPLE_DOC);
    const result = resolvePath(root, 'Guide.Getting Started.list[0]');
    expect(result.found).toBe(true);
    expect(result.type).toBe('block');
    expect((result.value as any).type).toBe('list');
  });

  it('should resolve list item', () => {
    const root = parseMarkdown(SAMPLE_DOC);
    const result = resolvePath(root, 'Guide."Getting Started".list[0][2]');
    expect(result.found).toBe(true);
    expect(result.type).toBe('listItem');
    expect((result.value as any).checked).toBe(true);
  });

  it('should resolve frontmatter', () => {
    const root = parseMarkdown(SAMPLE_DOC);
    const result = resolvePath(root, '$frontmatter.title');
    expect(result.found).toBe(true);
    expect(result.type).toBe('frontmatter');
    expect(result.value).toBe('My Project');
  });

  it('should resolve entire frontmatter object', () => {
    const root = parseMarkdown(SAMPLE_DOC);
    const result = resolvePath(root, '$frontmatter');
    expect(result.found).toBe(true);
    expect(result.type).toBe('frontmatter');
    expect(result.value).toMatchObject({ title: 'My Project', version: '1.0.0' });
  });

  it('should return not found for non-existent section', () => {
    const root = parseMarkdown(SAMPLE_DOC);
    const result = resolvePath(root, 'NonExistent');
    expect(result.found).toBe(false);
  });

  it('should return not found for non-existent frontmatter key', () => {
    const root = parseMarkdown(SAMPLE_DOC);
    const result = resolvePath(root, '$frontmatter.nonexistent');
    expect(result.found).toBe(false);
  });

  it('should return not found for out-of-range block index', () => {
    const root = parseMarkdown(SAMPLE_DOC);
    const result = resolvePath(root, 'Guide.Install.code[5]');
    expect(result.found).toBe(false);
  });
});

// ─── Mutations ───

describe('applyMutations', () => {
  it('should set frontmatter value', () => {
    const root = parseMarkdown(SAMPLE_DOC);
    const mutated = applyMutations(root, [
      { type: 'set', path: '$frontmatter.title', value: 'Updated Title' },
    ]);
    const output = serializeMarkdown(mutated);
    expect(output).toContain('title: Updated Title');
    // Original should be unchanged
    expect(output).toContain('version: 1.0.0');
  });

  it('should set frontmatter key that does not exist', () => {
    const root = parseMarkdown(SAMPLE_DOC);
    const mutated = applyMutations(root, [
      { type: 'set', path: '$frontmatter.newKey', value: 'new value' },
    ]);
    const output = serializeMarkdown(mutated);
    expect(output).toContain('newKey: new value');
  });

  it('should delete frontmatter key', () => {
    const root = parseMarkdown(SAMPLE_DOC);
    const mutated = applyMutations(root, [
      { type: 'delete', path: '$frontmatter.version' },
    ]);
    const output = serializeMarkdown(mutated);
    expect(output).not.toContain('version:');
    expect(output).toContain('title: My Project');
  });

  it('should replace section content', () => {
    const root = parseMarkdown(SAMPLE_DOC);
    const mutated = applyMutations(root, [
      { type: 'set', path: 'Guide.Install', value: 'New install instructions here.' },
    ]);
    const output = serializeMarkdown(mutated);
    expect(output).toContain('## Install');
    expect(output).toContain('New install instructions here.');
    expect(output).not.toContain('npm install');
  });

  it('should delete a section', () => {
    const root = parseMarkdown(SAMPLE_DOC);
    const mutated = applyMutations(root, [
      { type: 'delete', path: 'Guide.Configure' },
    ]);
    const output = serializeMarkdown(mutated);
    expect(output).toContain('## Install');
    expect(output).not.toContain('## Configure');
    expect(output).not.toContain('Server port');
  });

  it('should create a new section', () => {
    const root = parseMarkdown(SAMPLE_DOC);
    const mutated = applyMutations(root, [
      { type: 'set', path: 'Guide.Deploy', value: 'Deploy to production:\n\n```bash\nnpm run deploy\n```' },
    ]);
    const output = serializeMarkdown(mutated);
    expect(output).toContain('## Deploy');
    expect(output).toContain('Deploy to production:');
    expect(output).toContain('npm run deploy');
  });

  it('should create a new top-level section', () => {
    const root = parseMarkdown(SAMPLE_DOC);
    const mutated = applyMutations(root, [
      { type: 'set', path: 'Changelog', value: 'Version history.' },
    ]);
    const output = serializeMarkdown(mutated);
    expect(output).toContain('# Changelog');
    expect(output).toContain('Version history.');
  });

  it('should apply multiple mutations in order', () => {
    const root = parseMarkdown(SAMPLE_DOC);
    const mutated = applyMutations(root, [
      { type: 'set', path: '$frontmatter.title', value: 'Updated' },
      { type: 'delete', path: 'Guide.Configure' },
      { type: 'set', path: 'Guide.Install', value: 'Simplified install.' },
    ]);
    const output = serializeMarkdown(mutated);
    expect(output).toContain('title: Updated');
    expect(output).not.toContain('## Configure');
    expect(output).toContain('Simplified install.');
  });

  it('should not mutate the original root', () => {
    const root = parseMarkdown(SAMPLE_DOC);
    applyMutations(root, [
      { type: 'set', path: 'Guide.Install', value: 'Changed.' },
    ]);
    const originalOutput = serializeMarkdown(root);
    expect(originalOutput).toContain('npm install');
  });
});

// ─── MarkdownAdapter ───

describe('MarkdownAdapter', () => {
  const adapter = new MarkdownAdapter();

  describe('supports', () => {
    it('should support .md files', () => {
      expect(adapter.supports('readme.md')).toBe(true);
      expect(adapter.supports('docs/Guide.md')).toBe(true);
      expect(adapter.supports('NOTES.MD')).toBe(true);
    });

    it('should not support other files', () => {
      expect(adapter.supports('config.json')).toBe(false);
      expect(adapter.supports('config.yaml')).toBe(false);
      expect(adapter.supports('readme')).toBe(false);
      expect(adapter.supports('readme.md.bak')).toBe(false);
    });
  });

  describe('read', () => {
    it('should return null for missing file', () => {
      expect(adapter.read('/nonexistent/file.md')).toBeNull();
    });
  });
});
