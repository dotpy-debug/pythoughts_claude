import { useDraggable } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';

type Task = {
  id: string;
  title: string;
  description: string;
  x: number;
  y: number;
  color: string;
};

type CanvasTaskProps = {
  task: Task;
  onClick: () => void;
};

export function CanvasTask({ task, onClick }: CanvasTaskProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        position: 'absolute',
        left: `${task.x}px`,
        top: `${task.y}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: isDragging ? 50 : 10,
      }}
      className={`w-64 bg-gray-800 border-2 rounded-lg shadow-lg transition-all ${
        isDragging ? 'border-terminal-green shadow-2xl scale-105' : 'border-gray-700 hover:border-terminal-green'
      }`}
    >
      <div
        {...listeners}
        {...attributes}
        className="px-3 py-2 bg-gray-900 border-b border-gray-700 flex items-center justify-between cursor-grab active:cursor-grabbing rounded-t-lg"
      >
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
        </div>
        <GripVertical size={16} className="text-gray-500" />
      </div>

      <div
        onClick={onClick}
        className="p-4 cursor-pointer hover:bg-gray-750 transition-colors"
      >
        <div
          className="w-full h-1 rounded-full mb-3"
          style={{ backgroundColor: task.color }}
        />
        <h3 className="text-sm font-semibold text-gray-100 mb-2 font-mono line-clamp-2">
          {task.title}
        </h3>
        <p className="text-xs text-gray-400 font-mono line-clamp-3">
          {task.description}
        </p>
      </div>
    </div>
  );
}
