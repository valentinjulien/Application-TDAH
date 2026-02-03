import { useEffect, useState } from 'react';

export const useNotifications = () => {
  const [permission, setPermission] = useState(Notification.permission);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    }
    return 'denied';
  };

  const showNotification = (title, options = {}) => {
    if (permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/favicon.ico', // Adjust path
        badge: '/favicon.ico',
        ...options,
      });

      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      return notification;
    }
  };

  const scheduleNotification = (title, delay, options = {}) => {
    setTimeout(() => {
      showNotification(title, options);
    }, delay);
  };

  return {
    permission,
    requestPermission,
    showNotification,
    scheduleNotification,
  };
};