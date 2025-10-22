import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, List } from 'lucide-react';
import { TocItem, scrollToHeading, getActiveHeading } from '../../utils/toc-generator';

interface TableOfContentsProps {
  items: TocItem[];
  className?: string;
  onItemClick?: (id: string) => void;
}

export function TableOfContents({ items, className = '', onItemClick }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const active = getActiveHeading(items);
      setActiveId(active);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [items]);

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

    return (
      <li key={item.id} className={`${depth > 0 ? 'ml-4' : ''}`}>
        <div className="flex items-start group">
          {hasChildren && (
            <button
              onClick={() => toggleSection(item.id)}
              className="p-1 hover:bg-gray-700 rounded transition-colors mr-1 flex-shrink-0"
              type="button"
            >
              {isCollapsed ? (
                <ChevronRight size={14} className="text-gray-400" />
              ) : (
                <ChevronDown size={14} className="text-gray-400" />
              )}
            </button>
          )}
          <button
            onClick={() => handleItemClick(item.id)}
            className={`flex-1 text-left py-1.5 px-2 rounded transition-colors text-sm ${
              isActive
                ? 'bg-blue-600/20 text-blue-400 font-medium'
                : 'text-gray-300 hover:bg-gray-700 hover:text-gray-100'
            } ${!hasChildren ? 'ml-5' : ''}`}
            type="button"
          >
            {item.text}
          </button>
        </div>
        {hasChildren && !isCollapsed && (
          <ul className="mt-1 space-y-1">{item.children.map((child) => renderTocItem(child, depth + 1))}</ul>
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
          className={`${
            isMobileOpen
              ? 'fixed right-0 top-0 bottom-0 w-80 bg-gray-900 shadow-2xl'
              : 'sticky top-20'
          } lg:block`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            <div className="bg-gray-900 px-4 py-3 border-b border-gray-700 flex items-center justify-between">
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
            <nav className="p-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
              <ul className="space-y-1">{items.map((item) => renderTocItem(item))}</ul>
            </nav>
          </div>
        </aside>
      </div>
    </>
  );
}
