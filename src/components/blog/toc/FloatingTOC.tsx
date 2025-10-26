/**
 * Floating Table of Contents Component
 *
 * Features:
 * - Sticky positioning on desktop (left sidebar)
 * - IntersectionObserver for scroll spy
 * - Hierarchical TOC rendering
 * - Mobile sheet drawer
 * - Smooth scroll to sections
 * - Terminal aesthetic styling
 */

import { useState, useEffect, useRef } from 'react';
import { ChevronRight, List } from 'lucide-react';
import { TOCItem } from '../../../types/blog';
import { cn } from '../../../lib/utils';
import { ScrollArea } from '../../ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '../../ui/sheet';

interface FloatingTOCProps {
  items: TOCItem[];
  className?: string;
}

export function FloatingTOC({ items, className }: FloatingTOCProps) {
  const [activeId, setActiveId] = useState<string>('');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Set up IntersectionObserver for scroll spy
    const options = {
      rootMargin: '-80px 0px -70% 0px',
      threshold: 0,
    };

    const callback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveId(entry.target.id);
        }
      });
    };

    observerRef.current = new IntersectionObserver(callback, options);

    // Observe all heading elements
    const flatItems = flattenTOC(items);
    flatItems.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element && observerRef.current) {
        observerRef.current.observe(element);
      }
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [items]);

  const handleItemClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // Navbar height
      const elementPosition =
        element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });

      setIsMobileOpen(false);

      // Update URL hash
      window.history.pushState(null, '', `#${id}`);
    }
  };

  const renderTOCItem = (item: TOCItem, depth: number = 0) => {
    const isActive = activeId === item.id;
    const hasChildren = item.children && item.children.length > 0;

    return (
      <li key={item.id} className={cn('relative', depth > 0 && 'ml-4')}>
        <button
          onClick={() => handleItemClick(item.id)}
          className={cn(
            'w-full text-left py-1.5 px-3 rounded-md text-sm transition-all duration-200',
            'hover:bg-white/5 hover:text-[#27C93F]',
            isActive && 'text-[#27C93F] font-medium bg-[#27C93F]/10',
            !isActive && 'text-[#E6EDF3]/70'
          )}
        >
          <span className="flex items-center gap-2">
            {hasChildren && (
              <ChevronRight
                size={14}
                className={cn(
                  'transition-transform',
                  isActive && 'rotate-90'
                )}
              />
            )}
            {item.text}
          </span>
        </button>

        {hasChildren && (
          <ul className="mt-1 space-y-1">
            {item.children!.map((child) => renderTOCItem(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  if (items.length === 0) return null;

  // Desktop floating TOC
  const DesktopTOC = (
    <nav
      className={cn(
        'hidden lg:block sticky top-24 w-[220px]',
        'bg-[#161b22]/70 backdrop-blur-md border border-white/10 rounded-xl',
        'p-4 max-h-[calc(100vh-120px)]',
        className
      )}
      aria-label="Table of contents"
    >
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/10">
        <List size={16} className="text-[#27C93F]" />
        <h3 className="text-sm font-semibold text-[#E6EDF3]">On this page</h3>
      </div>

      <ScrollArea className="h-full">
        <ul className="space-y-1">
          {items.map((item) => renderTOCItem(item))}
        </ul>
      </ScrollArea>
    </nav>
  );

  // Mobile TOC (Sheet)
  const MobileTOC = (
    <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
      <SheetTrigger asChild>
        <button
          className="lg:hidden fixed bottom-6 right-6 z-50 bg-[#27C93F] text-[#0d1117] p-4 rounded-full shadow-lg hover:bg-[#27C93F]/90 transition-colors"
          aria-label="Open table of contents"
        >
          <List size={24} />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="bg-[#0d1117] border-white/10 w-80">
        <div className="flex items-center gap-2 mb-4">
          <List size={16} className="text-[#27C93F]" />
          <h3 className="text-sm font-semibold text-[#E6EDF3]">
            On this page
          </h3>
        </div>

        <ScrollArea className="h-full">
          <ul className="space-y-1">
            {items.map((item) => renderTOCItem(item))}
          </ul>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );

  return (
    <>
      {DesktopTOC}
      {MobileTOC}
    </>
  );
}

/**
 * Helper function to flatten hierarchical TOC
 */
function flattenTOC(items: TOCItem[]): TOCItem[] {
  const result: TOCItem[] = [];

  const traverse = (items: TOCItem[]) => {
    items.forEach((item) => {
      result.push(item);
      if (item.children) {
        traverse(item.children);
      }
    });
  };

  traverse(items);
  return result;
}
