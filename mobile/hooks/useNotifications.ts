import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushNotificationState {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  error: string | null;
}

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    registerForPushNotificationsAsync()
      .then(token => setExpoPushToken(token ?? null))
      .catch(err => setError(err.message));

    // Listen for incoming notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    // Listen for notification responses (when user taps)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      // Handle navigation or actions based on notification data
      const data = response.notification.request.content.data;
      if (data?.action) {
        // Handle custom actions
        console.log('Action:', data.action);
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return { expoPushToken, notification, error };
}

async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  let token: string | undefined;

  // Setup notification channel for Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366F1',
    });

    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Rappels de tâches',
      description: 'Notifications pour vos tâches importantes',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366F1',
    });

    await Notifications.setNotificationChannelAsync('pomodoro', {
      name: 'Timer Pomodoro',
      description: 'Notifications pour les sessions de focus',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  // Check if running on physical device
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return undefined;
  }

  // Get existing permission status
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permission if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permission not granted for push notifications');
    return undefined;
  }

  // Get Expo push token
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    
    if (projectId) {
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } else {
      // Fallback for development - generate a device token
      token = (await Notifications.getDevicePushTokenAsync()).data as string;
    }
    
    console.log('Push token:', token);
  } catch (e) {
    console.log('Error getting push token:', e);
    // For local testing, we can proceed without a token
  }

  return token;
}

// Schedule a local notification
export async function scheduleTaskReminder(
  taskId: string,
  taskText: string,
  triggerDate: Date,
  quadrant: number
): Promise<string> {
  const quadrantLabels: Record<number, string> = {
    1: '🔥 Urgent & Important',
    2: '⭐ Important',
    3: '⚡ Urgent',
    4: '📋 À faire',
  };

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: quadrantLabels[quadrant] || 'Rappel de tâche',
      body: taskText,
      data: { taskId, action: 'open_task' },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: 'reminders',
    },
  });

  return identifier;
}

// Schedule Pomodoro notification
export async function schedulePomodoroNotification(
  type: 'focus_end' | 'break_end',
  delaySeconds: number
): Promise<string> {
  const content = type === 'focus_end' 
    ? {
        title: '⏰ Pause méritée !',
        body: 'Votre session de focus est terminée. Prenez une pause.',
        data: { action: 'pomodoro_break' },
      }
    : {
        title: '💪 Prêt à reprendre ?',
        body: 'Votre pause est terminée. C\'est reparti !',
        data: { action: 'pomodoro_focus' },
      };

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      ...content,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: delaySeconds,
      channelId: 'pomodoro',
    },
  });

  return identifier;
}

// Schedule daily motivation notification
export async function scheduleDailyMotivation(hour: number = 9, minute: number = 0): Promise<string> {
  const motivations = [
    'Chaque petite victoire compte ! 🎯',
    'Tu fais du super boulot, continue ! 💪',
    'Une tâche à la fois, tu vas y arriver ! 🌟',
    'Rappelle-toi : le progrès, pas la perfection ! ✨',
    'Tu es capable de grandes choses aujourd\'hui ! 🚀',
  ];

  const randomMotivation = motivations[Math.floor(Math.random() * motivations.length)];

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Bonjour ! ☀️',
      body: randomMotivation,
      data: { action: 'daily_motivation' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: 'default',
    },
  });

  return identifier;
}

// Cancel a scheduled notification
export async function cancelNotification(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

// Cancel all scheduled notifications
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Get all scheduled notifications
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return await Notifications.getAllScheduledNotificationsAsync();
}

// Send immediate local notification (for testing)
export async function sendImmediateNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<string> {
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: null, // Immediate
  });

  return identifier;
}

export default useNotifications;
