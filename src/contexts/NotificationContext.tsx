import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase, Notification as NotificationType } from '../lib/supabase';
import { logger } from '../lib/logger';

type NotificationContextType = {
  notifications: NotificationType[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*, profiles(*)')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (error) {
      logger.error('Error loading notifications', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        userId: user?.id,
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  const subscribeToNotifications = useCallback(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`,
        },
        async (payload) => {
          const { data: newNotification } = await supabase
            .from('notifications')
            .select('*, profiles(*)')
            .eq('id', payload.new.id)
            .single();

          if (newNotification) {
            setNotifications(previous => [newNotification, ...previous]);
            setUnreadCount(previous => previous + 1);

            if ('Notification' in globalThis && Notification.permission === 'granted') {
              new globalThis.Notification(newNotification.title, {
                body: newNotification.message,
                icon: '/favicon.ico',
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications(previous =>
            previous.map(n => (n.id === payload.new.id ? { ...n, ...payload.new } : n))
          );
          if (payload.new.is_read && !payload.old.is_read) {
            setUnreadCount(previous => Math.max(0, previous - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (user) {
      loadNotifications();
      const unsubscribe = subscribeToNotifications();
      return unsubscribe;
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
    }
  }, [user, loadNotifications, subscribeToNotifications]);

  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('recipient_id', user.id);

      if (error) throw error;

      setNotifications(previous =>
        previous.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount(previous => Math.max(0, previous - 1));
    } catch (error) {
      logger.error('Error marking notification as read', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        notificationId,
        userId: user?.id,
      });
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(previous => previous.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      logger.error('Error marking all notifications as read', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        userId: user?.id,
      });
    }
  };

  const refreshNotifications = async () => {
    await loadNotifications();
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
