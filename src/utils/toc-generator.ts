export interface TocItem {
  id: string;
  text: string;
  level: number;
  children: TocItem[];
}

export interface TocData {
  items: TocItem[];
  headingCount: number;
  maxDepth: number;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateUniqueId(text: string, usedIds: Set<string>): string {
  let baseId = slugify(text);
  if (!baseId) {
    baseId = 'heading';
  }

  let id = baseId;
  let counter = 1;

  while (usedIds.has(id)) {
    id = `${baseId}-${counter}`;
    counter++;
  }

  usedIds.add(id);
  return id;
}

export function extractHeadingsFromMarkdown(markdown: string): TocItem[] {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings: Array<{ level: number; text: string; id: string }> = [];
  const usedIds = new Set<string>();

  let match;
  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = generateUniqueId(text, usedIds);

    headings.push({ level, text, id });
  }

  return buildHierarchy(headings);
}

export function extractHeadingsFromHTML(html: string): TocItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const headingElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
  const headings: Array<{ level: number; text: string; id: string }> = [];
  const usedIds = new Set<string>();

  headingElements.forEach((element) => {
    const level = parseInt(element.tagName.substring(1));
    const text = element.textContent?.trim() || '';

    let id = element.id;
    if (!id) {
      id = generateUniqueId(text, usedIds);
      element.id = id;
    } else {
      usedIds.add(id);
    }

    headings.push({ level, text, id });
  });

  return buildHierarchy(headings);
}

function buildHierarchy(headings: Array<{ level: number; text: string; id: string }>): TocItem[] {
  if (headings.length === 0) {
    return [];
  }

  const root: TocItem[] = [];
  const stack: TocItem[] = [];

  headings.forEach(({ level, text, id }) => {
    const item: TocItem = {
      id,
      text,
      level,
      children: [],
    };

    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(item);
    } else {
      stack[stack.length - 1].children.push(item);
    }

    stack.push(item);
  });

  return root;
}

export function generateTocData(content: string, format: 'markdown' | 'html' = 'markdown'): TocData {
  const items = format === 'markdown'
    ? extractHeadingsFromMarkdown(content)
    : extractHeadingsFromHTML(content);

  const flatList = flattenToc(items);
  const maxDepth = flatList.length > 0 ? Math.max(...flatList.map(item => item.level)) : 0;

  return {
    items,
    headingCount: flatList.length,
    maxDepth,
  };
}

export function flattenToc(items: TocItem[]): TocItem[] {
  const result: TocItem[] = [];

  function traverse(items: TocItem[]) {
    items.forEach(item => {
      result.push(item);
      if (item.children.length > 0) {
        traverse(item.children);
      }
    });
  }

  traverse(items);
  return result;
}

export function injectHeadingIds(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const headingElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
  const usedIds = new Set<string>();

  headingElements.forEach((element) => {
    if (!element.id) {
      const text = element.textContent?.trim() || '';
      const id = generateUniqueId(text, usedIds);
      element.id = id;
    } else {
      usedIds.add(element.id);
    }
  });

  return doc.body.innerHTML;
}

export function scrollToHeading(headingId: string, behavior: ScrollBehavior = 'smooth'): void {
  const element = document.getElementById(headingId);
  if (element) {
    // Account for fixed header height (typically 64-80px) plus some padding
    const headerHeight = 80;
    const additionalPadding = 20;
    const offset = headerHeight + additionalPadding;

    // Get the element's position relative to the viewport
    const elementPosition = element.getBoundingClientRect().top;
    // Add current scroll position to get absolute position
    const absolutePosition = elementPosition + window.pageYOffset;
    // Subtract offset to position element below fixed header
    const targetPosition = absolutePosition - offset;

    window.scrollTo({
      top: targetPosition,
      behavior,
    });

    // Update URL hash without triggering scroll
    if (window.history.pushState) {
      window.history.pushState(null, '', `#${headingId}`);
    } else {
      // Fallback for older browsers
      window.location.hash = headingId;
    }
  }
}

export function getActiveHeading(items: TocItem[]): string | null {
  const flatList = flattenToc(items);

  // Account for header height when determining active section
  const headerOffset = 150;
  const scrollPosition = window.scrollY + headerOffset;

  // Find the last heading that's above the current scroll position
  let activeId: string | null = null;

  for (let i = 0; i < flatList.length; i++) {
    const element = document.getElementById(flatList[i].id);
    if (element) {
      const elementTop = element.getBoundingClientRect().top + window.pageYOffset;

      // If this heading is above the scroll threshold, it's a candidate
      if (elementTop <= scrollPosition) {
        activeId = flatList[i].id;
      } else {
        // Once we find a heading below the threshold, stop searching
        break;
      }
    }
  }

  // If no heading is active yet, default to the first one if we've scrolled at all
  if (!activeId && flatList.length > 0 && window.scrollY > 0) {
    activeId = flatList[0].id;
  }

  return activeId;
}
