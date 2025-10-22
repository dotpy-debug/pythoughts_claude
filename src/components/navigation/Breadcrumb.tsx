/**
 * Breadcrumb Component
 *
 * Navigation breadcrumbs with structured data for SEO
 * Includes BreadcrumbList schema.org markup
 */

import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';

export interface BreadcrumbItem {
  /**
   * Display label for the breadcrumb
   */
  label: string;

  /**
   * URL path for the breadcrumb link
   */
  href: string;

  /**
   * Whether this is the current/active page
   */
  isCurrentPage?: boolean;
}

interface BreadcrumbProps {
  /**
   * Array of breadcrumb items
   */
  items: BreadcrumbItem[];

  /**
   * Show home icon as first item
   * @default true
   */
  showHome?: boolean;

  /**
   * Custom className
   */
  className?: string;
}

/**
 * Breadcrumb Navigation Component
 *
 * @example
 * ```tsx
 * <Breadcrumb
 *   items={[
 *     { label: 'Blog', href: '/blogs' },
 *     { label: 'My Post Title', href: '/post/123', isCurrentPage: true }
 *   ]}
 * />
 * ```
 */
export function Breadcrumb({ items, showHome = true, className = '' }: BreadcrumbProps) {
  // Generate BreadcrumbList structured data for SEO
  useEffect(() => {
    const breadcrumbList = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        ...(showHome
          ? [
              {
                '@type': 'ListItem',
                'position': 1,
                'name': 'Home',
                'item': 'https://pythoughts.com',
              },
            ]
          : []),
        ...items.map((item, index) => ({
          '@type': 'ListItem',
          'position': showHome ? index + 2 : index + 1,
          'name': item.label,
          'item': `https://pythoughts.com${item.href}`,
        })),
      ],
    };

    // Inject structured data
    const scriptId = 'breadcrumb-structured-data';
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(breadcrumbList);

    return () => {
      // Clean up on unmount
      const existingScript = document.getElementById(scriptId);
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [items, showHome]);

  const allItems = showHome
    ? [{ label: 'Home', href: '/', isCurrentPage: false }, ...items]
    : items;

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center space-x-2 text-sm font-mono ${className}`}
    >
      <ol className="flex items-center space-x-2">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;

          return (
            <li key={item.href} className="flex items-center space-x-2">
              {index > 0 && (
                <ChevronRight size={14} className="text-gray-600" aria-hidden="true" />
              )}

              {item.isCurrentPage || isLast ? (
                <span
                  className="text-gray-400"
                  aria-current={item.isCurrentPage ? 'page' : undefined}
                >
                  {index === 0 && showHome ? (
                    <Home size={14} className="inline" aria-label="Home" />
                  ) : (
                    item.label
                  )}
                </span>
              ) : (
                <Link
                  to={item.href}
                  className="text-terminal-green hover:text-terminal-blue transition-colors flex items-center"
                >
                  {index === 0 && showHome ? (
                    <Home size={14} className="inline" aria-label="Home" />
                  ) : (
                    item.label
                  )}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Generate breadcrumb items from a URL path
 *
 * @example
 * ```tsx
 * const items = generateBreadcrumbsFromPath('/blogs/react-tutorial', {
 *   '/blogs': 'Blog Posts',
 *   '/blogs/react-tutorial': 'React Tutorial for Beginners'
 * });
 * ```
 */
export function generateBreadcrumbsFromPath(
  path: string,
  labelMap: Record<string, string>
): BreadcrumbItem[] {
  const segments = path.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  let currentPath = '';
  for (let i = 0; i < segments.length; i++) {
    currentPath += `/${segments[i]}`;
    const isLast = i === segments.length - 1;

    breadcrumbs.push({
      label: labelMap[currentPath] || segments[i],
      href: currentPath,
      isCurrentPage: isLast,
    });
  }

  return breadcrumbs;
}
