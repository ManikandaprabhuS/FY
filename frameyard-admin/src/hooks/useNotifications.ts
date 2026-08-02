import { useEffect } from 'react';
import { useNotificationStore } from '../store/notificationStore';

export const useNotifications = (autoFetch = false) => {
  const notifications = useNotificationStore((state) => state.notifications);
  const loading = useNotificationStore((state) => state.loading);
  const error = useNotificationStore((state) => state.error);
  const fetchNotifications = useNotificationStore((state) => state.fetchNotifications);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const toggleNotificationRead = useNotificationStore((state) => state.toggleNotificationRead);
  const removeNotification = useNotificationStore((state) => state.removeNotification);

  useEffect(() => {
    if (autoFetch) {
      if (notifications.length === 0) {
        fetchNotifications(false);
      }

      const interval = setInterval(() => {
        fetchNotifications(true);
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [autoFetch, fetchNotifications, notifications.length]);

  return {
    notifications,
    loading,
    error,
    fetchNotifications,
    markAllAsRead,
    toggleNotificationRead,
    removeNotification,
  };
};
export default useNotifications;
