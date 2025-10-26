/**
 * Blog Content Renderer
 *
 * Renders pre-generated HTML from tiptap with:
 * - Custom prose styling
 * - Terminal aesthetic
 * - Syntax highlighting support
 * - Responsive design
 */

import { memo } from 'react';
import './blog-prose.css';

interface BlogContentProps {
  html: string;
  className?: string;
}

export const BlogContent = memo(function BlogContent({
  html,
  className,
}: BlogContentProps) {
  return (
    <article
      className={`
        blog-prose prose prose-invert prose-lg max-w-3xl mx-auto
        ${className || ''}
      `}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});
