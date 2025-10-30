import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, User, Tag, AlertCircle } from 'lucide-react';
import type { TaskWithDetails } from '../../actions/tasks';
import { formatDistanceToNow } from '../../utils/dateUtils';
import { sanitizeURL } from '../../utils/security';

interface KanbanTaskCardProps {
  task: TaskWithDetails;
  onClick?: () => void;
  isDragging?: boolean;
}

const priorityColors = {
  urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export function KanbanTaskCard({ task, onClick, isDragging }: KanbanTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || isSortableDragging ? 0.5 : 1,
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-gray-800 border border-gray-700 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-terminal-green transition-all shadow-sm hover:shadow-md group"
      onClick={(_e) => {
        // Don't trigger click when dragging
        if (!isDragging && !isSortableDragging) {
          onClick?.();
        }
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-100 font-mono line-clamp-2 flex-1">
          {task.title}
        </h4>
        <div className={`ml-2 flex-shrink-0 px-2 py-0.5 rounded text-xs font-semibold font-mono border ${priorityColors[task.priority]}`}>
          {task.priority}
        </div>
      </div>

      {task.description && (
        <p className="text-xs text-gray-400 font-mono line-clamp-2 mb-3">
          {task.description}
        </p>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.tags.slice(0, 3).map((tag, index) => (
            <div
              key={index}
              className="flex items-center space-x-1 px-2 py-0.5 bg-terminal-purple/20 border border-terminal-purple/30 text-terminal-purple rounded text-xs font-mono"
            >
              <Tag size={10} />
              <span>{tag}</span>
            </div>
          ))}
          {task.tags.length > 3 && (
            <div className="px-2 py-0.5 bg-gray-700 text-gray-400 rounded text-xs font-mono">
              +{task.tags.length - 3}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-3">
          {/* Assignee */}
          {task.assignee && (
            <div className="flex items-center space-x-1 text-gray-500" title={`Assigned to ${task.assignee.username}`}>
              {task.assignee.avatar_url ? (
                <img
                  src={sanitizeURL(task.assignee.avatar_url)}
                  alt={task.assignee.username}
                  className="w-4 h-4 rounded-full border border-terminal-blue"
                />
              ) : (
                <User size={14} className="text-terminal-blue" />
              )}
            </div>
          )}

          {/* Due Date */}
          {task.due_date && (
            <div className={`flex items-center space-x-1 ${isOverdue ? 'text-red-400' : 'text-gray-500'}`}>
              {isOverdue && <AlertCircle size={12} />}
              <Calendar size={12} />
              <span>{formatDistanceToNow(task.due_date)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
