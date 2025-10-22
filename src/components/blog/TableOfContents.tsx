import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, ChevronRight, List } from 'lucide-react';
import { TocItem, scrollToHeading, getActiveHeading, flattenToc } from '../../utils/toc-generator';

interface TableOfContentsProps {
  items: TocItem[];
  className?: string;
  onItemClick?: (id: string) => void;
}

export function TableOfContents({ items, className = '', onItemClick }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const tocRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Get flattened list of all TOC items for keyboard navigation
  const flatItems = useCallback(() => flattenToc(items), [items])();

  // Use IntersectionObserver for active heading detection (better performance than scroll events)
  useEffect(() => {
    const observerOptions = {
      // Trigger when heading crosses 20% from top (accounting for header)
      rootMargin: '-80px 0px -70% 0px',
      threshold: 0,
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveId(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Observe all headings
    flatItems.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [flatItems]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keyboard navigation when TOC is focused
      if (!tocRef.current?.contains(document.activeElement)) {
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) => Math.min(prev + 1, flatItems.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Home':
          e.preventDefault();
          setFocusedIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setFocusedIndex(flatItems.length - 1);
          break;
        case 'Enter':
          e.preventDefault();
          if (flatItems[focusedIndex]) {
            handleItemClick(flatItems[focusedIndex].id);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          // Expand collapsed section if current item has children
          if (flatItems[focusedIndex]?.children.length > 0) {
            const newCollapsed = new Set(collapsedSections);
            newCollapsed.delete(flatItems[focusedIndex].id);
            setCollapsedSections(newCollapsed);
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          // Collapse section if current item has children
          if (flatItems[focusedIndex]?.children.length > 0) {
            const newCollapsed = new Set(collapsedSections);
            newCollapsed.add(flatItems[focusedIndex].id);
            setCollapsedSections(newCollapsed);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, flatItems, collapsedSections]);

  // Auto-scroll focused item into view within TOC container (keyboard navigation)
  useEffect(() => {
    const focusedItem = flatItems[focusedIndex];
    if (focusedItem && itemRefs.current.has(focusedItem.id)) {
      const button = itemRefs.current.get(focusedItem.id);
      button?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      button?.focus();
    }
  }, [focusedIndex, flatItems]);

  // Auto-scroll active item into view within TOC container (page scrolling)
  useEffect(() => {
    if (activeId && itemRefs.current.has(activeId)) {
      const button = itemRefs.current.get(activeId);
      // Only scroll if user is not currently using keyboard navigation
      if (document.activeElement !== button) {
        button?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [activeId]);

  const handleItemClick = (id: string) => {
    scrollToHeading(id);
    setActiveId(id);
    setIsMobileOpen(false);
    if (onItemClick) {
      onItemClick(id);
    }
  };

  const toggleSection = (id: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(id)) {
      newCollapsed.delete(id);
    } else {
      newCollapsed.add(id);
    }
    setCollapsedSections(newCollapsed);
  };

  const renderTocItem = (item: TocItem, depth: number = 0) => {
    const hasChildren = item.children.length > 0;
    const isCollapsed = collapsedSections.has(item.id);
    const isActive = activeId === item.id;
    const isFocused = flatItems[focusedIndex]?.id === item.id;

    return (
      <li key={item.id} className={`${depth > 0 ? 'ml-4' : ''}`}>
        <div className="flex items-start group">
          {hasChildren && (
            <button
              onClick={() => toggleSection(item.id)}
              className="p-1 hover:bg-gray-700 rounded transition-colors mr-1 flex-shrink-0"
              type="button"
              tabIndex={-1}
              aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
              aria-expanded={!isCollapsed}
            >
              <ChevronRight
                size={14}
                className={`text-gray-400 transition-transform duration-200 ${
                  isCollapsed ? '' : 'rotate-90'
                }`}
              />
            </button>
          )}
          <button
            ref={(el) => {
              if (el) {
                itemRefs.current.set(item.id, el);
              } else {
                itemRefs.current.delete(item.id);
              }
            }}
            onClick={() => handleItemClick(item.id)}
            className={`flex-1 text-left py-1.5 px-2 rounded transition-colors text-sm ${
              isActive
                ? 'bg-blue-600/20 text-blue-400 font-medium'
                : isFocused
                ? 'bg-gray-700 text-gray-100 ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-900'
                : 'text-gray-300 hover:bg-gray-700 hover:text-gray-100'
            } ${!hasChildren ? 'ml-5' : ''}`}
            type="button"
            aria-current={isActive ? 'location' : undefined}
          >
            {item.text}
          </button>
        </div>
        {hasChildren && (
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[1000px] opacity-100'
            }`}
          >
            <ul className="mt-1 space-y-1">{item.children.map((child) => renderTocItem(child, depth + 1))}</ul>
          </div>
        )}
      </li>
    );
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <button
        className="lg:hidden fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg z-40 hover:bg-blue-700 transition-colors"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        type="button"
      >
        <List size={24} />
      </button>

      <div
        className={`${className} ${
          isMobileOpen ? 'fixed inset-0 z-50 bg-black/50 lg:bg-transparent' : 'hidden lg:block'
        }`}
        onClick={() => setIsMobileOpen(false)}
      >
        <aside
          ref={tocRef}
          className={`${
            isMobileOpen
              ? 'fixed right-0 top-0 bottom-0 w-80 bg-gray-900 shadow-2xl'
              : 'sticky top-20'
          } lg:block`}
          onClick={(e) => e.stopPropagation()}
          aria-label="Table of contents navigation"
        >
          <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            <div className="bg-gray-900 px-4 py-3 border-b border-gray-700">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-gray-100 flex items-center gap-2">
                  <List size={18} />
                  Table of Contents
                </h3>
                {isMobileOpen && (
                  <button
                    onClick={() => setIsMobileOpen(false)}
                    className="text-gray-400 hover:text-gray-100 lg:hidden"
                    type="button"
                  >
                    Close
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Use <kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-400">↑</kbd> <kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-400">↓</kbd> to navigate, <kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-400">Enter</kbd> to select
              </p>
            </div>
            <nav className="p-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
              <ul className="space-y-1">{items.map((item) => renderTocItem(item))}</ul>
            </nav>
          </div>
        </aside>
      </div>
    </>
  );
}
