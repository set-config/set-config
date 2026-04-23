/**
 * Semantic path resolver for Markdown section-based addressing.
 */

import type { Root, RootContent, Heading, Code, List, Yaml } from 'mdast';
import { tokenizeKeyPath } from '@set-config/core';
import {
  parseMarkdown, serializeMarkdown,
  buildSections, rebuildChildren,
  extractHeadingText,
} from './parser.js';
import type { Section } from './parser.js';
import { parseYaml, stringifyYaml } from '@set-config/yaml';

// ─── Path segment types ───

interface HeadingSegment {
  kind: 'heading';
  text: string;
}

interface BlockSegment {
  kind: 'block';
  blockType: string;
  index: number;
}

interface ListItemSegment {
  kind: 'listItem';
  index: number;
}

interface FrontmatterSegment {
  kind: 'frontmatter';
  key: string;
}

type PathSegment = HeadingSegment | BlockSegment | ListItemSegment | FrontmatterSegment;

// ─── Path parser ───

const KNOWN_BLOCK_TYPES = new Set(['code', 'table', 'list', 'paragraph', 'blockquote', 'html', 'thematicBreak']);

export function parseSemanticPath(path: string): PathSegment[] {
  if (!path || path === '') return [];

  if (path.startsWith('$frontmatter')) {
    const rest = path.length > '$frontmatter'.length ? path.slice('$frontmatter'.length) : '';
    const key = rest.startsWith('.') ? rest.slice(1) : '';
    return [{ kind: 'frontmatter', key }];
  }

  const tokens = tokenizeKeyPath(path);
  const segments: PathSegment[] = [];
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    if (KNOWN_BLOCK_TYPES.has(token) && i + 1 < tokens.length && /^\d+$/.test(tokens[i + 1])) {
      segments.push({ kind: 'block', blockType: token, index: parseInt(tokens[i + 1], 10) });
      i += 2;

      if (token === 'list' && i < tokens.length && /^\d+$/.test(tokens[i])) {
        segments.push({ kind: 'listItem', index: parseInt(tokens[i], 10) });
        i++;
      }
      continue;
    }

    segments.push({ kind: 'heading', text: token });
    i++;
  }

  return segments;
}

// ─── Resolve ───

export interface ResolveResult {
  found: boolean;
  value: unknown;
  type: 'section' | 'block' | 'frontmatter' | 'root' | 'listItem';
}

export function resolvePath(root: Root, path: string): ResolveResult {
  if (!path || path === '') {
    return { found: true, value: root, type: 'root' };
  }

  const segments = parseSemanticPath(path);

  if (segments.length === 1 && segments[0].kind === 'frontmatter') {
    return resolveFrontmatter(root, segments[0].key);
  }

  const { sections } = buildSections(root);
  let currentSection: Section | null = null;

  for (let si = 0; si < segments.length; si++) {
    const seg = segments[si];

    if (seg.kind === 'heading') {
      const siblings: Section[] = currentSection ? currentSection.children : sections;
      const matches = siblings.filter((s: Section) => s.heading.text === seg.text);

      if (matches.length === 0) {
        return { found: false, value: undefined, type: 'section' };
      }

      currentSection = matches[0];
      continue;
    }

    if (seg.kind === 'block') {
      // Check if next segment is a listItem (e.g., list[0][1])
      const next = si + 1 < segments.length ? segments[si + 1] : null;
      if (next && next.kind === 'listItem' && seg.blockType === 'list') {
        // Don't return yet — let listItem segment handle it
        continue;
      }
      const blocks: RootContent[] = currentSection ? currentSection.blocks : [];
      const filtered = blocks.filter(b => b.type === seg.blockType);
      if (seg.index < filtered.length) {
        return { found: true, value: filtered[seg.index], type: 'block' };
      }
      return { found: false, value: undefined, type: 'block' };
    }

    if (seg.kind === 'listItem') {
      const prev = si > 0 ? segments[si - 1] : null;
      if (prev && prev.kind === 'block' && prev.blockType === 'list') {
        const blocks: RootContent[] = currentSection ? currentSection.blocks : [];
        const lists = blocks.filter((b): b is List => b.type === 'list');
        if (prev.index < lists.length) {
          const list = lists[prev.index];
          if (seg.index < list.children.length) {
            return { found: true, value: list.children[seg.index], type: 'listItem' };
          }
        }
      }
      return { found: false, value: undefined, type: 'listItem' };
    }
  }

  if (currentSection) {
    return { found: true, value: currentSection, type: 'section' };
  }

  return { found: false, value: undefined, type: 'section' };
}

function resolveFrontmatter(root: Root, key: string): ResolveResult {
  const fmNode = root.children.find((n): n is Yaml => n.type === 'yaml');
  if (!fmNode) return { found: false, value: undefined, type: 'frontmatter' };

  const data = parseYaml(fmNode.value) as Record<string, unknown> | null;
  if (!data) return { found: false, value: undefined, type: 'frontmatter' };

  if (!key) return { found: true, value: data, type: 'frontmatter' };

  const keys = key.split('.');
  let current: unknown = data;
  for (const k of keys) {
    if (current && typeof current === 'object' && k in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[k];
    } else {
      return { found: false, value: undefined, type: 'frontmatter' };
    }
  }
  return { found: true, value: current, type: 'frontmatter' };
}

// ─── Mutations ───

export interface Mutation {
  type: 'set' | 'delete';
  path: string;
  value?: unknown;
}

export function applyMutations(root: Root, mutations: Mutation[]): Root {
  const cloned = JSON.parse(JSON.stringify(root)) as Root;
  const { sections, rootBlocks } = buildSections(cloned);

  for (const mutation of mutations) {
    if (mutation.type === 'set') {
      applySet(cloned, sections, rootBlocks, mutation.path, mutation.value);
    } else if (mutation.type === 'delete') {
      applyDelete(cloned, sections, rootBlocks, mutation.path);
    }
  }

  // Rebuild root.children from mutated section tree
  cloned.children = rebuildChildren(sections, rootBlocks);

  return cloned;
}

function findSection(
  sections: Section[],
  segments: PathSegment[],
): { section: Section | null; remaining: PathSegment[] } {
  let currentSections: Section[] = sections;
  let currentSection: Section | null = null;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    if (seg.kind === 'heading') {
      const source: Section[] = currentSection ? currentSection.children : currentSections;
      const matches = source.filter((s: Section) => s.heading.text === seg.text);

      if (matches.length === 0) return { section: currentSection, remaining: segments.slice(i) };

      if (matches.length === 1) {
        currentSection = matches[0];
        currentSections = currentSection.children;
      } else {
        const next = i + 1 < segments.length ? segments[i + 1] : null;
        if (next && next.kind === 'heading' && /^\d+$/.test(next.text)) {
          const idx = parseInt(next.text, 10);
          if (idx < matches.length) {
            currentSection = matches[idx];
            currentSections = currentSection.children;
            i++;
          } else {
            return { section: currentSection, remaining: segments.slice(i) };
          }
        } else {
          return { section: currentSection, remaining: segments.slice(i) };
        }
      }
    } else {
      return { section: currentSection, remaining: segments.slice(i) };
    }
  }

  return { section: currentSection, remaining: [] };
}

function applySet(
  root: Root,
  sections: Section[],
  rootBlocks: RootContent[],
  path: string,
  value: unknown,
): void {
  if (!path || path === '') {
    const newRoot = parseMarkdown(String(value));
    root.children = newRoot.children;
    return;
  }

  const segments = parseSemanticPath(path);

  if (segments.length === 1 && segments[0].kind === 'frontmatter') {
    setFrontmatter(root, segments[0].key, value);
    return;
  }

  const { section, remaining } = findSection(sections, segments);

  if (section && remaining.length === 0) {
    // Replace existing section content
    const content = String(value);
    const newRoot = parseMarkdown(content);

    const firstHeading = newRoot.children.find((n): n is Heading => n.type === 'heading');
    if (firstHeading && firstHeading.depth === section.heading.depth) {
      section.heading.text = extractHeadingText(firstHeading);
      section._headingNode.children = firstHeading.children;
      section.blocks = newRoot.children.filter(n => n !== firstHeading);
    } else {
      section.blocks = newRoot.children;
    }
  } else if (!section || (section && remaining.length > 0 && remaining.every(s => s.kind === 'heading'))) {
    // Create new section (not found → remaining are unmatched headings)
    // If section is non-null, create as child of that section
    const content = String(value);
    const newRoot = parseMarkdown(content);

    const depth = segments.filter(s => s.kind === 'heading').length;
    const headingText = segments[segments.length - 1].kind === 'heading'
      ? (segments[segments.length - 1] as HeadingSegment).text
      : 'Untitled';

    let headingNode: Heading;
    let contentBlocks: RootContent[];

    const firstHeading = newRoot.children.find((n): n is Heading => n.type === 'heading');
    if (firstHeading) {
      headingNode = firstHeading;
      contentBlocks = newRoot.children.filter(n => n !== firstHeading);
    } else {
      headingNode = {
        type: 'heading',
        depth: Math.min(Math.max(depth, 1), 6) as Heading['depth'],
        children: [{ type: 'text', value: headingText }],
        position: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } },
      };
      contentBlocks = newRoot.children;
    }

    const newSection: Section = {
      heading: { depth: headingNode.depth, text: extractHeadingText(headingNode) },
      blocks: contentBlocks,
      children: [],
      _headingNode: headingNode,
    };

    const targetSections = section ? section.children : sections;
    targetSections.push(newSection);
    return;
  }

  // Block-level set within section
  if (section && remaining.length > 0) {
    const first = remaining[0];
    if (first.kind === 'block') {
      const blocks = section.blocks;
      const filtered = blocks.filter(b => b.type === first.blockType);

      if (first.index < filtered.length) {
        const block = filtered[first.index];
        const blockIndex = blocks.indexOf(block);
        const newBlocks = parseMarkdown(String(value)).children;
        if (newBlocks.length > 0) {
          blocks[blockIndex] = newBlocks[0];
        }
      }
    }
  }
}

function setFrontmatter(root: Root, key: string, value: unknown): void {
  let fmNode = root.children.find((n): n is Yaml => n.type === 'yaml');
  let data: Record<string, unknown> = fmNode ? ((parseYaml(fmNode.value) || {}) as Record<string, unknown>) : {};

  if (!key) {
    data = value as Record<string, unknown>;
  } else {
    const keys = key.split('.');
    let target = data;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in target)) target[keys[i]] = {};
      target = target[keys[i]] as Record<string, unknown>;
    }
    target[keys[keys.length - 1]] = value;
  }

  const newYamlValue = stringifyYaml(data);
  if (fmNode) {
    fmNode.value = newYamlValue;
  } else {
    root.children.unshift({
      type: 'yaml',
      value: newYamlValue,
      position: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } },
    } as Yaml);
  }
}

function applyDelete(
  root: Root,
  sections: Section[],
  rootBlocks: RootContent[],
  path: string,
): void {
  const segments = parseSemanticPath(path);

  if (segments.length === 1 && segments[0].kind === 'frontmatter') {
    deleteFrontmatter(root, segments[0].key);
    return;
  }

  const { section, remaining } = findSection(sections, segments);

  if (remaining.length === 0 && section) {
    removeFromSections(sections, section);
  }
}

function deleteFrontmatter(root: Root, key: string): void {
  const fmIndex = root.children.findIndex(n => n.type === 'yaml');
  if (fmIndex === -1) return;

  if (!key) {
    root.children.splice(fmIndex, 1);
    return;
  }

  const fmNode = root.children[fmIndex] as Yaml;
  const data = parseYaml(fmNode.value) as Record<string, unknown> | null;
  if (!data) return;

  const keys = key.split('.');
  let target: Record<string, unknown> = data;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in target)) return;
    target = target[keys[i]] as Record<string, unknown>;
  }
  delete target[keys[keys.length - 1]];
  fmNode.value = stringifyYaml(data);
}

function removeFromSections(siblings: Section[], target: Section): boolean {
  const idx = siblings.indexOf(target);
  if (idx !== -1) {
    siblings.splice(idx, 1);
    return true;
  }
  for (const s of siblings) {
    if (removeFromSections(s.children, target)) return true;
  }
  return false;
}
