/**
 * Blog Table of Contents (TOC) Component
 *
 * Automatically generates a table of contents from blog post headings:
 * - Parses markdown/HTML for h1-h6 tags
 * - Creates hierarchical structure
 * - Smooth scroll navigation
 * - Highlights current section
 * - Sticky sidebar or inline display
 */

import { useEffect, useState, useMemo } from 'react';
import { List, ChevronRight } from 'lucide-react';

interface TOCHeading {
  id: string;
  text: string;
  level: number;
  element?: HTMLElement;
}

interface BlogTOCProps {
  /**
   * The HTML content to parse for headings
   */
  content: string;

  /**
   * Container element to search for headings (defaults to document)
   */
  containerRef?: React.RefObject<HTMLElement>;

  /**
   * Maximum heading level to include (1-6)
   * @default 3
   */
  maxDepth?: number;

  /**
   * Position type: 'sticky' for sidebar, 'inline' for content
   * @default 'sticky'
   */
  position?: 'sticky' | 'inline';

  /**
   * Show TOC title
   * @default true
   */
  showTitle?: boolean;

  /**
   * Custom className for styling
   */
  className?: string;

  /**
   * Callback when a heading is clicked
   */
  onHeadingClick?: (heading: TOCHeading) => void;
}

export function BlogTOC({
  content,
  containerRef,
  maxDepth = 3,
  position = 'sticky',
  showTitle = true,
  className = '',
  onHeadingClick,
}: BlogTOCProps) {
  const [activeId, setActiveId] = useState<string>('');
  const [headings, setHeadings] = useState<TOCHeading[]>([]);

  // Parse content and extract headings
  const parsedHeadings = useMemo(() => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;

    const headingElements = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const parsed: TOCHeading[] = [];

    headingElements.forEach((heading, index) => {
      const level = parseInt(heading.tagName[1]);
      if (level > maxDepth) return;

      const text = heading.textContent || '';
      // Generate ID from text if not present
      const id = heading.id || `heading-${index}-${text.toLowerCase().replace(/\s+/g, '-')}`;

      parsed.push({
        id,
        text,
        level,
      });
    });

    return parsed;
  }, [content, maxDepth]);

  // Update headings with actual DOM elements after render
  useEffect(() => {
    const container = containerRef?.current || document;
    const updatedHeadings = parsedHeadings.map((heading) => {
      const element = container.querySelector(`#${heading.id}`) as HTMLElement;
      return { ...heading, element };
    });

    setHeadings(updatedHeadings);
  }, [parsedHeadings, containerRef]);

  // Track scroll position and highlight active heading
  useEffect(() => {
    if (headings.length === 0) return;

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100; // Offset for better UX

      // Find the heading that's currently in view
      let currentId = '';
      for (let i = headings.length - 1; i >= 0; i--) {
        const heading = headings[i];
        if (heading.element) {
          const top = heading.element.offsetTop;
          if (scrollPosition >= top) {
            currentId = heading.id;
            break;
          }
        }
      }

      setActiveId(currentId);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, [headings]);

  const handleClick = (heading: TOCHeading) => {
    if (heading.element) {
      const yOffset = -80; // Offset for fixed headers
      const y = heading.element.getBoundingClientRect().top + window.pageYOffset + yOffset;

      window.scrollTo({ top: y, behavior: 'smooth' });
    }

    if (onHeadingClick) {
      onHeadingClick(heading);
    }
  };

  if (headings.length === 0) {
    return null;
  }

  const baseClasses = position === 'sticky'
    ? 'sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto'
    : 'mb-8';

  return (
    <nav
      className={`
        bg-gray-900 border border-gray-800 rounded-lg p-4
        ${baseClasses}
        ${className}
      `}
      aria-label="Table of contents"
    >
      {showTitle && (
        <div className="flex items-center mb-3 pb-3 border-b border-gray-800">
          <List className="w-5 h-5 text-orange-500 mr-2" />
          <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wide">
            Table of Contents
          </h3>
        </div>
      )}

      <ul className="space-y-1">
        {headings.map((heading) => {
          const isActive = activeId === heading.id;
          const indent = (heading.level - 1) * 16; // 16px per level

          return (
            <li key={heading.id} style={{ paddingLeft: `${indent}px` }}>
              <button
                onClick={() => handleClick(heading)}
                className={`
                  w-full text-left px-2 py-1.5 rounded-md transition-all duration-200
                  flex items-start group
                  ${
                    isActive
                      ? 'bg-orange-500/20 text-orange-400 font-medium'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                  }
                `}
                aria-current={isActive ? 'true' : undefined}
              >
                <ChevronRight
                  className={`
                    w-4 h-4 mt-0.5 mr-1 flex-shrink-0 transition-transform
                    ${isActive ? 'rotate-90' : 'group-hover:translate-x-0.5'}
                  `}
                />
                <span className="text-sm leading-tight">{heading.text}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Progress indicator */}
      {position === 'sticky' && (
        <div className="mt-4 pt-4 border-t border-gray-800">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Reading Progress</span>
            <span>
              {headings.findIndex((h) => h.id === activeId) + 1} / {headings.length}
            </span>
          </div>
          <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 transition-all duration-300"
              style={{
                width: `${
                  ((headings.findIndex((h) => h.id === activeId) + 1) / headings.length) * 100
                }%`,
              }}
            />
          </div>
        </div>
      )}
    </nav>
  );
}

/**
 * Hook to generate TOC data from markdown content
 */
export function useTOC(markdownContent: string, maxDepth: number = 3) {
  return useMemo(() => {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const headings: TOCHeading[] = [];
    let match;

    while ((match = headingRegex.exec(markdownContent)) !== null) {
      const level = match[1].length;
      if (level > maxDepth) continue;

      const text = match[2];
      const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');

      headings.push({ id, text, level });
    }

    return headings;
  }, [markdownContent, maxDepth]);
}

/**
 * Utility function to inject IDs into markdown headings
 */
export function addHeadingIds(markdown: string): string {
  return markdown.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, text) => {
    const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
    return `${hashes} ${text} {#${id}}`;
  });
}

/**
 * Utility function to extract heading structure for nested TOC
 */
export function buildNestedTOC(headings: TOCHeading[]): NestedTOCItem[] {
  const root: NestedTOCItem[] = [];
  const stack: NestedTOCItem[] = [];

  headings.forEach((heading) => {
    const item: NestedTOCItem = {
      ...heading,
      children: [],
    };

    // Find the correct parent based on level
    while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(item);
    } else {
      stack[stack.length - 1].children!.push(item);
    }

    stack.push(item);
  });

  return root;
}

interface NestedTOCItem extends TOCHeading {
  children?: NestedTOCItem[];
}

/**
 * Recursive component for nested TOC rendering
 */
export function NestedTOC({
  items,
  activeId,
  onItemClick,
}: {
  items: NestedTOCItem[];
  activeId: string;
  onItemClick: (item: TOCHeading) => void;
}) {
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const isActive = activeId === item.id;
        const hasChildren = item.children && item.children.length > 0;

        return (
          <li key={item.id}>
            <button
              onClick={() => onItemClick(item)}
              className={`
                w-full text-left px-2 py-1.5 rounded-md transition-all duration-200
                flex items-start group
                ${
                  isActive
                    ? 'bg-orange-500/20 text-orange-400 font-medium'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }
              `}
            >
              <ChevronRight
                className={`
                  w-4 h-4 mt-0.5 mr-1 flex-shrink-0 transition-transform
                  ${isActive ? 'rotate-90' : 'group-hover:translate-x-0.5'}
                `}
              />
              <span className="text-sm leading-tight">{item.text}</span>
            </button>
            {hasChildren && (
              <div className="ml-4 mt-1">
                <NestedTOC items={item.children!} activeId={activeId} onItemClick={onItemClick} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
