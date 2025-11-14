/**
 * Table of Contents Generator
 *
 * Generates stable, hierarchical table of contents from tiptap JSON content.
 * Features:
 * - Unique slug generation with collision handling
 * - Hierarchical nesting (h2 > h3 > h4)
 * - International character support
 * - Word count and reading time calculation
 */

import slugify from 'slugify';
import { JSONContent } from '@tiptap/react';
import { TOCItem } from '../../types/blog';

export class TOCGenerator {
  private usedSlugs = new Set<string>();

  /**
   * Generate stable, unique slug for heading
   * Handles duplicates by appending counter
   */
  generateSlug(text: string): string {
    let baseSlug = slugify(text, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g,
    });

    // Handle empty slugs
    if (!baseSlug) {
      baseSlug = 'heading';
    }

    // Ensure uniqueness
    let finalSlug = baseSlug;
    let counter = 1;

    while (this.usedSlugs.has(finalSlug)) {
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    this.usedSlugs.add(finalSlug);
    return finalSlug;
  }

  /**
   * Extract TOC from tiptap JSON
   * Only includes h2-h4 headings in TOC for readability
   */
  extractFromJSON(content: JSONContent): TOCItem[] {
    const headings: TOCItem[] = [];
    this.usedSlugs.clear();

    const traverse = (node: JSONContent) => {
      if (node.type === 'heading' && node.content) {
        const level = node.attrs?.level || 1;
        const text = this.extractText(node);

        if (text && level >= 2 && level <= 4) {
          // Only h2-h4 in TOC
          const id = this.generateSlug(text);

          headings.push({
            id,
            text,
            level,
          });
        }
      }

      if (node.content) {
        node.content.forEach(traverse);
      }
    };

    if (content.content) {
      content.content.forEach(traverse);
    }

    return this.buildHierarchy(headings);
  }

  /**
   * Extract plain text from tiptap node
   * Recursively concatenates all text nodes
   */
  private extractText(node: JSONContent): string {
    if (!node.content) return '';

    return node.content
      .map((child) => {
        if (child.type === 'text') return child.text || '';
        if (child.content) return this.extractText(child);
        return '';
      })
      .join('');
  }

  /**
   * Build hierarchical TOC structure
   * Properly nests child headings under parent headings
   */
  private buildHierarchy(flatItems: TOCItem[]): TOCItem[] {
    const root: TOCItem[] = [];
    const stack: TOCItem[] = [];

    for (const item of flatItems) {
      // Pop stack until we find correct parent
      while (stack.length > 0 && stack.at(-1)!.level >= item.level) {
        stack.pop();
      }

      const newItem = { ...item, children: [] };

      if (stack.length === 0) {
        root.push(newItem);
      } else {
        const parent = stack.at(-1)!;
        if (!parent.children) parent.children = [];
        parent.children.push(newItem);
      }

      stack.push(newItem);
    }

    return root;
  }

  /**
   * Flatten hierarchical TOC
   * Useful for scroll spy observers
   */
  flattenTOC(items: TOCItem[]): TOCItem[] {
    const result: TOCItem[] = [];

    const traverse = (items: TOCItem[]) => {
      for (const item of items) {
        result.push(item);
        if (item.children) {
          traverse(item.children);
        }
      }
    };

    traverse(items);
    return result;
  }
}

/**
 * Calculate reading time from word count
 * @param wordCount - Total word count
 * @param wpm - Words per minute (default 200)
 * @returns Reading time in minutes
 */
export function calculateReadingTime(
  wordCount: number,
  wpm: number = 200
): number {
  return Math.ceil(wordCount / wpm);
}

/**
 * Extract word count from tiptap JSON
 * Counts all text nodes, split by whitespace
 */
export function extractWordCount(content: JSONContent): number {
  let count = 0;

  const traverse = (node: JSONContent) => {
    if (node.type === 'text' && node.text) {
      count += node.text.split(/\s+/).filter((word) => word.length > 0).length;
    }

    if (node.content) {
      node.content.forEach(traverse);
    }
  };

  if (content.content) {
    content.content.forEach(traverse);
  }

  return count;
}
