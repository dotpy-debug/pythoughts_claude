/**
 * Vimeo TipTap Extension
 *
 * Custom TipTap extension for embedding Vimeo videos
 * Features:
 * - Parse Vimeo URLs and extract video IDs
 * - Privacy-focused (Do Not Track support)
 * - Customizable player controls
 * - Terminal theme color customization
 * - Paste handler for automatic embedding
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { parseVimeoUrl, buildVimeoEmbedUrl } from '../../../lib/video-utils';

export interface VimeoOptions {
  /**
   * Add paste handler to auto-embed on paste
   * @default true
   */
  addPasteHandler: boolean;

  /**
   * Allow fullscreen
   * @default true
   */
  allowFullscreen: boolean;

  /**
   * Autoplay video on load
   * @default false
   */
  autoplay: boolean;

  /**
   * Loop video
   * @default false
   */
  loop: boolean;

  /**
   * Mute video by default
   * @default false
   */
  muted: boolean;

  /**
   * Show player controls
   * @default true
   */
  controls: boolean;

  /**
   * Show video title
   * @default true
   */
  title: boolean;

  /**
   * Show video author/byline
   * @default true
   */
  byline: boolean;

  /**
   * Show author portrait
   * @default true
   */
  portrait: boolean;

  /**
   * Player color (hex without #)
   * @default '00ff9f' (terminal green)
   */
  color: string;

  /**
   * Enable Do Not Track
   * @default true
   */
  dnt: boolean;

  /**
   * Default width in pixels
   * @default 640
   */
  width: number;

  /**
   * Default height in pixels
   * @default 360
   */
  height: number;

  /**
   * Inline or block element
   * @default false
   */
  inline: boolean;

  /**
   * Custom HTML attributes
   */
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    vimeo: {
      /**
       * Insert a Vimeo video
       */
      setVimeoVideo: (options: {
        src: string;
        width?: number;
        height?: number;
      }) => ReturnType;
    };
  }
}

export const Vimeo = Node.create<VimeoOptions>({
  name: 'vimeo',

  addOptions() {
    return {
      addPasteHandler: true,
      allowFullscreen: true,
      autoplay: false,
      loop: false,
      muted: false,
      controls: true,
      title: true,
      byline: true,
      portrait: true,
      color: '00ff9f', // Terminal green
      dnt: true, // Privacy-focused
      width: 640,
      height: 360,
      inline: false,
      HTMLAttributes: {},
    };
  },

  inline() {
    return this.options.inline;
  },

  group() {
    return this.options.inline ? 'inline' : 'block';
  },

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      width: {
        default: this.options.width,
      },
      height: {
        default: this.options.height,
      },
      videoId: {
        default: null,
        parseHTML: (element) => {
          return element.dataset.vimeoId;
        },
        renderHTML: (attributes) => {
          if (!attributes.videoId) {
            return {};
          }

          return {
            'data-vimeo-id': attributes.videoId,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-vimeo-video]',
      },
      {
        tag: 'iframe[src*="player.vimeo.com"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const embedUrl = buildVimeoEmbedUrl(HTMLAttributes.videoId || '', {
      autoplay: this.options.autoplay,
      loop: this.options.loop,
      muted: this.options.muted,
      controls: this.options.controls,
      title: this.options.title,
      byline: this.options.byline,
      portrait: this.options.portrait,
      color: this.options.color,
      dnt: this.options.dnt,
    });

    return [
      'div',
      {
        'data-vimeo-video': '',
        class: 'vimeo-video-wrapper',
      },
      [
        'iframe',
        mergeAttributes(
          this.options.HTMLAttributes,
          {
            width: HTMLAttributes.width,
            height: HTMLAttributes.height,
            src: embedUrl,
            allowfullscreen: this.options.allowFullscreen,
            allow: 'autoplay; fullscreen; picture-in-picture',
            frameborder: '0',
          },
          HTMLAttributes
        ),
      ],
    ];
  },

  addCommands() {
    return {
      setVimeoVideo:
        (options: { src: string; width?: number; height?: number }) =>
        ({ commands }) => {
          const videoData = parseVimeoUrl(options.src);

          if (!videoData) {
            return false;
          }

          return commands.insertContent({
            type: this.name,
            attrs: {
              src: options.src,
              videoId: videoData.videoId,
              width: options.width || this.options.width,
              height: options.height || this.options.height,
            },
          });
        },
    };
  },

  addPasteRules() {
    if (!this.options.addPasteHandler) {
      return [];
    }

    return [
      {
        find: /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(?:.*\/)?([\d]+)/gi,
        handler: ({ match, chain, range }) => {
          const videoData = parseVimeoUrl(match[0]);

          if (!videoData) {
            return;
          }

          chain()
            .deleteRange(range)
            .setVimeoVideo({
              src: match[0],
            })
            .run();
        },
      },
    ];
  },
});
