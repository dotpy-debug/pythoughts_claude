import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';

interface KanbanColumnProps {
  id: string;
  title: string;
  count: number;
  color: string;
  children: React.ReactNode;
  onAddTask?: () => void;
}

export function KanbanColumn({ id, title, count, color, children, onAddTask }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`bg-gray-900 border-2 ${color} rounded-lg p-4 transition-all ${
        isOver ? 'ring-2 ring-terminal-green shadow-glow-green' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-100 font-mono">{title}</h3>
          <p className="text-xs text-gray-500 font-mono mt-1">{count} tasks</p>
        </div>
        {onAddTask && (
          <button
            onClick={onAddTask}
            className="p-1 rounded bg-gray-800 border border-gray-700 hover:border-terminal-green hover:bg-gray-750 transition-colors"
            title="Add task"
          >
            <Plus size={16} className="text-gray-400" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
