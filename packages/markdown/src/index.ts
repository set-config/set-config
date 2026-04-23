import fs from 'fs';
import type { Root } from 'mdast';
import { parseMarkdown, serializeMarkdown, buildSections } from './parser.js';
import { parseYaml } from '@set-config/yaml';

/**
 * Markdown Adapter for set-config.
 *
 * Uses semantic section paths based on heading hierarchy.
 * Built on micromark + mdast-util (remark's底层).
 */
export class MarkdownAdapter {
  supports(filename: string): boolean {
    return /\.md$/i.test(filename);
  }

  read(filepath: string): unknown {
    if (!fs.existsSync(filepath)) return null;
    const content = fs.readFileSync(filepath, 'utf8');
    const root = parseMarkdown(content);

    const { sections, rootBlocks } = buildSections(root);
    const fmNode = rootBlocks.find(b => b.type === 'yaml');
    const frontmatter = fmNode ? parseYaml((fmNode as { value: string }).value) : null;

    return {
      $frontmatter: frontmatter,
      _root: root,
      _sections: sections,
    };
  }

  write(filepath: string, data: unknown): void {
    if (!data || typeof data !== 'object') {
      throw new Error('Markdown write requires a data object');
    }

    const model = data as Record<string, unknown>;
    const root = model._root as Root | undefined;

    if (root) {
      const result = serializeMarkdown(root);
      fs.writeFileSync(filepath, result);
    } else {
      const result = serializeMarkdown({
        type: 'root',
        children: [],
        position: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } },
      });
      fs.writeFileSync(filepath, result);
    }
  }
}

export default MarkdownAdapter;

// ─── Public API ───

export { parseMarkdown, serializeMarkdown, buildSections, rebuildChildren, extractText, extractHeadingText, extractNodeText } from './parser.js';
export type { Section } from './parser.js';
export { resolvePath, applyMutations, parseSemanticPath } from './resolver.js';
export type { ResolveResult, Mutation } from './resolver.js';
