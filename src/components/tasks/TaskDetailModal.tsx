import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Task } from '../../lib/supabase';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Calendar, User, Tag, Clock, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from '../../utils/dateUtils';

interface TaskDetailModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export function TaskDetailModal({ task, isOpen, onClose, onUpdate }: TaskDetailModalProps) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(task.due_date || '');

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
  const canEdit = user && (user.id === task.creator_id || user.id === task.assignee_id);

  const handleSave = async () => {
    if (!canEdit) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title,
          description,
          status,
          priority,
          due_date: dueDate || null,
        })
        .eq('id', task.id);

      if (error) throw error;

      setEditing(false);
      onUpdate?.();
      onClose();
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!canEdit || !confirm('Are you sure you want to delete this task?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', task.id);

      if (error) throw error;

      onUpdate?.();
      onClose();
    } catch (error) {
      console.error('Error deleting task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async () => {
    if (!canEdit) return;

    setLoading(true);
    try {
      const newStatus = task.status === 'completed' ? 'todo' : 'completed';
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', task.id);

      if (error) throw error;

      onUpdate?.();
      onClose();
    } catch (error) {
      console.error('Error updating task status:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          {editing ? (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-2xl font-bold"
            />
          ) : (
            <h2 className="text-2xl font-bold text-gray-100 flex-1 font-mono">{task.title}</h2>
          )}
          {canEdit && !editing && (
            <Button onClick={() => setEditing(true)} variant="outline" size="sm">
              edit
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {editing ? (
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Task['status'])}
              className="px-3 py-1.5 rounded text-sm font-mono border border-gray-700 bg-gray-800 text-gray-100 focus:border-terminal-green focus:ring-2 focus:ring-terminal-green/20 outline-none"
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          ) : (
            <Badge variant={status === 'completed' ? 'success' : 'primary'}>
              {status.replace('_', ' ')}
            </Badge>
          )}

          {editing ? (
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Task['priority'])}
              className="px-3 py-1.5 rounded text-sm font-mono border border-gray-700 bg-gray-800 text-gray-100 focus:border-terminal-green focus:ring-2 focus:ring-terminal-green/20 outline-none"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          ) : (
            <Badge variant={priority === 'urgent' ? 'danger' : 'warning'}>
              {priority}
            </Badge>
          )}

          {task.tags.map((tag) => (
            <Badge key={tag} variant="purple" className="flex items-center space-x-1">
              <Tag size={12} />
              <span>{tag}</span>
            </Badge>
          ))}
        </div>

        <div className="border-t border-b border-gray-700 py-4 space-y-3">
          <div className="flex items-center space-x-3 text-sm text-gray-400 font-mono">
            <User size={18} className="text-gray-500" />
            <span>Created by {task.profiles?.username}</span>
          </div>

          {task.assignee && (
            <div className="flex items-center space-x-3 text-sm text-gray-400 font-mono">
              <User size={18} className="text-gray-500" />
              <span>Assigned to {task.assignee.username}</span>
            </div>
          )}

          <div className="flex items-center space-x-3 text-sm text-gray-400 font-mono">
            <Clock size={18} className="text-gray-500" />
            <span>Created {formatDistanceToNow(task.created_at)}</span>
          </div>

          {editing ? (
            <div className="flex items-center space-x-3">
              <Calendar size={18} className="text-gray-500" />
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="flex-1"
              />
            </div>
          ) : task.due_date ? (
            <div className={`flex items-center space-x-3 text-sm font-mono ${isOverdue ? 'text-red-400 font-medium' : 'text-gray-400'}`}>
              <Calendar size={18} />
              <span>Due {new Date(task.due_date).toLocaleDateString()}</span>
            </div>
          ) : null}

          {task.completed_at && (
            <div className="flex items-center space-x-3 text-sm text-terminal-green font-mono">
              <CheckCircle size={18} />
              <span>Completed {formatDistanceToNow(task.completed_at)}</span>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-mono font-semibold text-gray-300 mb-2">
            <span className="text-terminal-green">$ </span>Description
          </h3>
          {editing ? (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="w-full px-4 py-2.5 rounded border border-gray-700 bg-gray-800 text-gray-100 focus:border-terminal-green focus:ring-2 focus:ring-terminal-green/20 transition-all duration-200 outline-none resize-none font-mono placeholder:text-gray-500"
            />
          ) : (
            <p className="text-gray-400 whitespace-pre-wrap font-mono text-sm">
              {task.description || 'No description provided'}
            </p>
          )}
        </div>

        {canEdit && (
          <div className="flex justify-between items-center pt-4 border-t border-gray-700">
            <div>
              {editing ? (
                <div className="flex space-x-2">
                  <Button onClick={handleSave} loading={loading} variant="terminal">
                    save changes
                  </Button>
                  <Button onClick={() => setEditing(false)} variant="ghost">
                    cancel
                  </Button>
                </div>
              ) : (
                <div className="flex space-x-2">
                  <Button
                    onClick={handleToggleComplete}
                    loading={loading}
                    variant={task.status === 'completed' ? 'outline' : 'terminal'}
                    icon={<CheckCircle size={18} />}
                  >
                    {task.status === 'completed' ? 'reopen' : 'complete'}
                  </Button>
                </div>
              )}
            </div>
            {!editing && (
              <Button onClick={handleDelete} loading={loading} variant="danger" size="sm">
                delete task
              </Button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
