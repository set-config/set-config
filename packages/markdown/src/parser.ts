/**
 * Markdown parser/serializer built on micromark + mdast-util (remark's底层).
 */

import { fromMarkdown } from 'mdast-util-from-markdown';
import { toMarkdown } from 'mdast-util-to-markdown';
import { frontmatterFromMarkdown, frontmatterToMarkdown } from 'mdast-util-frontmatter';
import { frontmatter } from 'micromark-extension-frontmatter';
import { gfmFromMarkdown, gfmToMarkdown } from 'mdast-util-gfm';
import { gfm } from 'micromark-extension-gfm';
import type { Root, RootContent, Heading, Code, List, ListItem, Table, Paragraph, PhrasingContent, Yaml } from 'mdast';

// ─── Parse ───

export function parseMarkdown(content: string): Root {
  return fromMarkdown(content, {
    extensions: [frontmatter(['yaml']), gfm()],
    mdastExtensions: [frontmatterFromMarkdown(['yaml']), gfmFromMarkdown()],
  });
}

// ─── Serialize ───

export function serializeMarkdown(root: Root): string {
  return toMarkdown(root, {
    extensions: [frontmatterToMarkdown(['yaml']), gfmToMarkdown()],
    bullet: '-',
    bulletOrdered: '.',
    emphasis: '*',
    strong: '*',
    fence: '`',
    fences: true,
    tightDefinitions: true,
  });
}

// ─── Text extraction ───

export function extractText(node: PhrasingContent | PhrasingContent[]): string {
  const nodes = Array.isArray(node) ? node : [node];
  return nodes.map(n => {
    switch (n.type) {
      case 'text': return n.value;
      case 'emphasis': return extractText(n.children);
      case 'strong': return extractText(n.children);
      case 'inlineCode': return n.value;
      case 'break': return '\n';
      case 'link': return extractText(n.children);
      case 'linkReference': return extractText(n.children);
      case 'image': return n.alt || '';
      case 'imageReference': return n.alt || '';
      case 'delete': return extractText(n.children);
      case 'footnoteReference': return n.label || '';
      default: return '';
    }
  }).join('');
}

/**
 * Extract plain text from heading node (accepts Heading directly).
 */
export function extractHeadingText(node: Heading): string {
  return extractText(node.children);
}

/**
 * Extract plain text from any flow node's text content.
 */
export function extractNodeText(node: RootContent): string {
  switch (node.type) {
    case 'heading': return extractText(node.children);
    case 'paragraph': return extractText(node.children);
    case 'code': return node.value;
    case 'list': return node.children.map(item => extractNodeText(item)).join('\n');
    case 'listItem': return node.children.map(c => extractNodeText(c)).join('\n');
    case 'table': return node.children.map(row => row.children.map(cell => extractText(cell.children)).join(' | ')).join('\n');
    case 'tableRow': return node.children.map(cell => extractText(cell.children)).join(' | ');
    case 'tableCell': return extractText(node.children);
    case 'blockquote': return node.children.map(c => extractNodeText(c)).join('\n');
    case 'thematicBreak': return '---';
    case 'html': return node.value;
    case 'yaml': return node.value;
    case 'definition': return node.label || node.identifier;
    case 'footnoteDefinition': return '';
    default: return '';
  }
}

// ─── Type guards ───

export function isCode(node: RootContent): node is Code { return node.type === 'code'; }
export function isTable(node: RootContent): node is Table { return node.type === 'table'; }
export function isList(node: RootContent): node is List { return node.type === 'list'; }
export function isListItem(node: RootContent): node is ListItem { return node.type === 'listItem'; }
export function isHeading(node: RootContent): node is Heading { return node.type === 'heading'; }
export function isYaml(node: RootContent): node is Yaml { return node.type === 'yaml'; }
export function isParagraph(node: RootContent): node is Paragraph { return node.type === 'paragraph'; }

// ─── Section model ───

export interface Section {
  heading: { depth: number; text: string };
  blocks: RootContent[];
  children: Section[];
  _headingNode: Heading;
}

/**
 * Build section tree from flat MDAST children.
 */
export function buildSections(root: Root): { sections: Section[]; rootBlocks: RootContent[] } {
  const sections: Section[] = [];
  const rootBlocks: RootContent[] = [];
  const sectionStack: Section[] = [];

  for (const node of root.children) {
    if (node.type === 'heading') {
      while (sectionStack.length > 0 && sectionStack[sectionStack.length - 1].heading.depth >= node.depth) {
        sectionStack.pop();
      }

      const section: Section = {
        heading: { depth: node.depth, text: extractText(node.children) },
        blocks: [],
        children: [],
        _headingNode: node,
      };

      if (sectionStack.length > 0) {
        sectionStack[sectionStack.length - 1].children.push(section);
      } else {
        sections.push(section);
      }
      sectionStack.push(section);
    } else if (node.type === 'yaml') {
      rootBlocks.push(node);
    } else {
      const current = sectionStack[sectionStack.length - 1];
      if (current) {
        current.blocks.push(node);
      } else {
        rootBlocks.push(node);
      }
    }
  }

  return { sections, rootBlocks };
}

/**
 * Rebuild flat MDAST children from section tree.
 */
export function rebuildChildren(sections: Section[], rootBlocks: RootContent[]): RootContent[] {
  const children: RootContent[] = [...rootBlocks];

  const flatten = (secs: Section[]) => {
    for (const section of secs) {
      children.push(section._headingNode);
      children.push(...section.blocks);
      flatten(section.children);
    }
  };

  flatten(sections);
  return children;
}
