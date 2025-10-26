/**
 * TOC Generator Unit Tests
 *
 * Tests slug generation, hierarchy building, and utility functions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TOCGenerator,
  calculateReadingTime,
  extractWordCount,
} from '@/utils/blog/toc-generator';
import { JSONContent } from '@tiptap/react';

describe('TOCGenerator', () => {
  let generator: TOCGenerator;

  beforeEach(() => {
    generator = new TOCGenerator();
  });

  describe('generateSlug', () => {
    it('should generate lowercase slugs with hyphens', () => {
      const slug = generator.generateSlug('Hello World');
      expect(slug).toBe('hello-world');
    });

    it('should handle unique slugs for duplicate text', () => {
      const slug1 = generator.generateSlug('Hello World');
      const slug2 = generator.generateSlug('Hello World');

      expect(slug1).toBe('hello-world');
      expect(slug2).toBe('hello-world-1');
    });

    it('should handle empty heading text', () => {
      const slug = generator.generateSlug('');
      expect(slug).toBe('heading');
    });

    it('should remove special characters', () => {
      const slug = generator.generateSlug('Hello! @World (2024)');
      expect(slug).toBe('hello-world-2024');
    });

    it('should handle international characters', () => {
      const slug1 = generator.generateSlug('你好世界');
      const slug2 = generator.generateSlug('Привет мир');

      // slugify should transliterate or remove non-ASCII
      expect(slug1).toMatch(/^[a-z0-9-]+$/);
      expect(slug2).toMatch(/^[a-z0-9-]+$/);
    });

    it('should handle multiple consecutive special characters', () => {
      const slug = generator.generateSlug('Hello!!!   World???');
      expect(slug).toBe('hello-world');
    });
  });

  describe('extractFromJSON', () => {
    it('should extract single heading', () => {
      const content: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Introduction' }],
          },
        ],
      };

      const toc = generator.extractFromJSON(content);

      expect(toc).toHaveLength(1);
      expect(toc[0].text).toBe('Introduction');
      expect(toc[0].level).toBe(2);
      expect(toc[0].id).toBe('introduction');
    });

    it('should build hierarchical structure', () => {
      const content: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Introduction' }],
          },
          {
            type: 'heading',
            attrs: { level: 3 },
            content: [{ type: 'text', text: 'Overview' }],
          },
          {
            type: 'heading',
            attrs: { level: 3 },
            content: [{ type: 'text', text: 'Goals' }],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Methodology' }],
          },
        ],
      };

      const toc = generator.extractFromJSON(content);

      expect(toc).toHaveLength(2);
      expect(toc[0].text).toBe('Introduction');
      expect(toc[0].children).toHaveLength(2);
      expect(toc[0].children?.[0].text).toBe('Overview');
      expect(toc[0].children?.[1].text).toBe('Goals');
      expect(toc[1].text).toBe('Methodology');
    });

    it('should ignore h1 and h5+ headings', () => {
      const content: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Title' }],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Section' }],
          },
          {
            type: 'heading',
            attrs: { level: 5 },
            content: [{ type: 'text', text: 'Subsection' }],
          },
        ],
      };

      const toc = generator.extractFromJSON(content);

      expect(toc).toHaveLength(1);
      expect(toc[0].text).toBe('Section');
    });

    it('should handle empty content', () => {
      const content: JSONContent = {
        type: 'doc',
        content: [],
      };

      const toc = generator.extractFromJSON(content);

      expect(toc).toEqual([]);
    });

    it('should handle headings with formatted text', () => {
      const content: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [
              { type: 'text', text: 'Hello ' },
              {
                type: 'text',
                text: 'World',
                marks: [{ type: 'bold' }],
              },
            ],
          },
        ],
      };

      const toc = generator.extractFromJSON(content);

      expect(toc).toHaveLength(1);
      expect(toc[0].text).toBe('Hello World');
    });
  });

  describe('flattenTOC', () => {
    it('should flatten hierarchical TOC', () => {
      const hierarchical = [
        {
          id: 'section-1',
          text: 'Section 1',
          level: 2,
          children: [
            { id: 'subsection-1-1', text: 'Subsection 1.1', level: 3 },
            { id: 'subsection-1-2', text: 'Subsection 1.2', level: 3 },
          ],
        },
        {
          id: 'section-2',
          text: 'Section 2',
          level: 2,
        },
      ];

      const flat = generator.flattenTOC(hierarchical);

      expect(flat).toHaveLength(4);
      expect(flat[0].id).toBe('section-1');
      expect(flat[1].id).toBe('subsection-1-1');
      expect(flat[2].id).toBe('subsection-1-2');
      expect(flat[3].id).toBe('section-2');
    });
  });
});

describe('calculateReadingTime', () => {
  it('should calculate reading time at 200 wpm', () => {
    expect(calculateReadingTime(200)).toBe(1);
    expect(calculateReadingTime(400)).toBe(2);
    expect(calculateReadingTime(250)).toBe(2); // rounds up
  });

  it('should support custom wpm', () => {
    expect(calculateReadingTime(300, 100)).toBe(3);
  });

  it('should handle zero words', () => {
    expect(calculateReadingTime(0)).toBe(0);
  });
});

describe('extractWordCount', () => {
  it('should count words in simple paragraph', () => {
    const content: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'This is a test' }],
        },
      ],
    };

    const count = extractWordCount(content);
    expect(count).toBe(4);
  });

  it('should count words across multiple paragraphs', () => {
    const content: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'First paragraph here' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Second paragraph here' }],
        },
      ],
    };

    const count = extractWordCount(content);
    expect(count).toBe(6);
  });

  it('should handle empty content', () => {
    const content: JSONContent = {
      type: 'doc',
      content: [],
    };

    const count = extractWordCount(content);
    expect(count).toBe(0);
  });

  it('should handle multiple spaces', () => {
    const content: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello    World' }],
        },
      ],
    };

    const count = extractWordCount(content);
    expect(count).toBe(2);
  });
});
