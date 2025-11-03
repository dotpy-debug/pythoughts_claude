import { memo } from 'react';
import { Calendar, User, Tag, Clock } from 'lucide-react';
import { Task } from '../../lib/supabase';
import { Badge } from '../ui/Badge';
import { formatDistanceToNow } from '../../utils/dateUtils';

interface TaskCardProperties {
  task: Task;
  onClick: () => void;
}

const priorityColors: Record<Task['priority'], 'default' | 'primary' | 'warning' | 'danger'> = {
  low: 'default',
  medium: 'primary',
  high: 'warning',
  urgent: 'danger',
};

const statusColors: Record<Task['status'], 'default' | 'primary' | 'success' | 'purple'> = {
  todo: 'default',
  in_progress: 'primary',
  completed: 'success',
  archived: 'purple',
};

export const TaskCard = memo(function TaskCard({ task, onClick }: TaskCardProperties) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-card-hover transition-all duration-200 cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-base font-semibold text-gray-900 group-hover:text-logrocket-blue-500 transition-colors line-clamp-2 flex-1">
          {task.title}
        </h3>
        <Badge variant={priorityColors[task.priority]} className="ml-2 shrink-0">
          {task.priority}
        </Badge>
      </div>

      {task.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        <Badge variant={statusColors[task.status]}>
          {task.status.replace('_', ' ')}
        </Badge>
        {task.tags.map((tag) => (
          <Badge key={tag} variant="purple" className="flex items-center space-x-1">
            <Tag size={12} />
            <span>{tag}</span>
          </Badge>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-3">
          {task.due_date && (
            <div className={`flex items-center space-x-1 ${isOverdue ? 'text-red-500 font-medium' : ''}`}>
              <Calendar size={14} />
              <span>{new Date(task.due_date).toLocaleDateString()}</span>
            </div>
          )}
          {task.assignee && (
            <div className="flex items-center space-x-1">
              <User size={14} />
              <span>{task.assignee.username}</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <Clock size={14} />
          <span>{formatDistanceToNow(task.created_at)}</span>
        </div>
      </div>
    </div>
  );
});
