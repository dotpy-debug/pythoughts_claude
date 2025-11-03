/**
 * Callout Extension
 *
 * Custom tiptap extension for creating callout/alert blocks.
 * Supports different types: info, warning, danger.
 */

import { Node, mergeAttributes } from '@tiptap/core';

export interface CalloutOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (
        attributes?: { type?: 'info' | 'warning' | 'danger' }
      ) => ReturnType;
      toggleCallout: () => ReturnType;
    };
  }
}

export const Callout = Node.create<CalloutOptions>({
  name: 'callout',

  group: 'block',

  content: 'block+',

  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: (element) => element.dataset.type,
        renderHTML: (attributes) => ({
          'data-type': attributes.type,
          class: `callout callout-${attributes.type}`,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="callout"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addCommands() {
    return {
      setCallout:
        (attributes) =>
        ({ commands }) => {
          return commands.wrapIn(this.name, attributes);
        },
      toggleCallout:
        () =>
        ({ commands }) => {
          return commands.toggleWrap(this.name);
        },
    };
  },
});
