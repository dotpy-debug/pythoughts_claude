/**
 * Custom Heading Extension
 *
 * Extends the default tiptap Heading extension to support ID attributes
 * for anchor links in the table of contents.
 */

import Heading from '@tiptap/extension-heading';
import { mergeAttributes } from '@tiptap/core';

export const CustomHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('id'),
        renderHTML: (attributes) => {
          if (!attributes.id) {
            return {};
          }
          return {
            id: attributes.id,
          };
        },
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const level = this.options.levels.includes(node.attrs.level)
      ? node.attrs.level
      : this.options.levels[0];

    return [
      `h${level}`,
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-heading-level': level,
      }),
      0,
    ];
  },
});
