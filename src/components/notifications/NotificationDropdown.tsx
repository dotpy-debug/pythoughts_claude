import { useNotifications } from '../../contexts/NotificationContext';
import { NotificationItem } from './NotificationItem';
import { CheckCheck, Loader2 } from 'lucide-react';

type NotificationDropdownProps = {
  onClose: () => void;
};

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const { notifications, loading, markAllAsRead, unreadCount } = useNotifications();

  return (
    <div className="absolute right-0 mt-2 w-96 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-50 overflow-hidden">
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
        </div>
        <span className="text-gray-100 font-mono text-sm">notifications.log</span>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-terminal-green hover:text-terminal-blue text-xs font-mono transition-colors flex items-center space-x-1"
          >
            <CheckCheck size={14} />
            <span>mark all read</span>
          </button>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto bg-gray-900">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-terminal-green" size={24} />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-gray-500 font-mono text-sm">$ no notifications found</p>
            <p className="text-gray-600 font-mono text-xs mt-1">system idle...</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClose={onClose}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
