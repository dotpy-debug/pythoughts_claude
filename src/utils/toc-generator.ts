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
    const offset = 80;
    const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
    const offsetPosition = elementPosition - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior,
    });
  }
}

export function getActiveHeading(items: TocItem[]): string | null {
  const flatList = flattenToc(items);
  const scrollPosition = window.scrollY + 100;

  for (let i = flatList.length - 1; i >= 0; i--) {
    const element = document.getElementById(flatList[i].id);
    if (element && element.offsetTop <= scrollPosition) {
      return flatList[i].id;
    }
  }

  return flatList.length > 0 ? flatList[0].id : null;
}
