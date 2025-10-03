import { Notification as NotificationType } from '../../lib/supabase';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatDistanceToNow } from '../../utils/dateUtils';
import { MessageCircle, ThumbsUp, UserPlus, FileText } from 'lucide-react';

type NotificationItemProps = {
  notification: NotificationType;
  onClose: () => void;
};

export function NotificationItem({ notification, onClose }: NotificationItemProps) {
  const { markAsRead } = useNotifications();

  const handleClick = () => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    onClose();
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'post_reply':
        return <MessageCircle size={16} className="text-terminal-blue" />;
      case 'comment_reply':
        return <MessageCircle size={16} className="text-terminal-purple" />;
      case 'vote':
        return <ThumbsUp size={16} className="text-terminal-green" />;
      case 'task_assigned':
        return <UserPlus size={16} className="text-terminal-pink" />;
      default:
        return <FileText size={16} className="text-terminal-sky" />;
    }
  };

  const getTypeLabel = () => {
    switch (notification.type) {
      case 'post_reply':
        return 'POST_REPLY';
      case 'comment_reply':
        return 'COMMENT_REPLY';
      case 'vote':
        return 'VOTE';
      case 'task_assigned':
        return 'TASK_ASSIGNED';
      default:
        return 'NOTIFICATION';
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`px-4 py-3 hover:bg-gray-800 cursor-pointer transition-colors ${
        !notification.is_read ? 'bg-gray-850' : ''
      }`}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-1">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs font-mono text-terminal-green">
              [{getTypeLabel()}]
            </span>
            {!notification.is_read && (
              <span className="w-2 h-2 bg-terminal-green rounded-full animate-pulse" />
            )}
          </div>
          <p className="text-sm font-medium text-gray-100 mb-1">{notification.title}</p>
          <p className="text-xs text-gray-400 font-mono line-clamp-2">
            {notification.message}
          </p>
          <p className="text-xs text-gray-600 font-mono mt-2">
            $ {formatDistanceToNow(notification.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
}
