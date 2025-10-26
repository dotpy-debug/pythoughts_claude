/**
 * Editor TOC Component
 *
 * Live table of contents preview for the blog editor
 * Updates in real-time as headings are added/modified
 */

import { useEffect, useState } from 'react';
import { Editor } from '@tiptap/react';
import { List } from 'lucide-react';
import { TOCItem } from '../../../types/blog';
import { TOCGenerator } from '../../../utils/blog/toc-generator';
import { ScrollArea } from '../../ui/scroll-area';

interface EditorTOCProps {
  editor: Editor;
}

export function EditorTOC({ editor }: EditorTOCProps) {
  const [tocItems, setTocItems] = useState<TOCItem[]>([]);

  useEffect(() => {
    // Update TOC when editor content changes
    const updateTOC = () => {
      const generator = new TOCGenerator();
      const toc = generator.extractFromJSON(editor.getJSON());
      setTocItems(toc);
    };

    updateTOC();

    // Listen to editor updates
    editor.on('update', updateTOC);

    return () => {
      editor.off('update', updateTOC);
    };
  }, [editor]);

  const renderTOCItem = (item: TOCItem, depth: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;

    return (
      <li key={item.id} className={depth > 0 ? 'ml-4' : ''}>
        <div className="py-1.5 px-3 text-sm text-[#E6EDF3]/70">
          {item.text}
        </div>

        {hasChildren && (
          <ul className="mt-1 space-y-1">
            {item.children!.map((child) => renderTOCItem(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <nav
      className="hidden lg:block sticky top-24 bg-[#161b22]/70 backdrop-blur-md border border-white/10 rounded-xl p-4 max-h-[calc(100vh-120px)]"
      aria-label="Table of contents preview"
    >
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/10">
        <List size={16} className="text-[#27C93F]" />
        <h3 className="text-sm font-semibold text-[#E6EDF3]">
          Live Preview
        </h3>
      </div>

      <ScrollArea className="h-full">
        {tocItems.length === 0 ? (
          <p className="text-sm text-[#E6EDF3]/40 italic">
            No headings yet...
          </p>
        ) : (
          <ul className="space-y-1">
            {tocItems.map((item) => renderTOCItem(item))}
          </ul>
        )}
      </ScrollArea>
    </nav>
  );
}
