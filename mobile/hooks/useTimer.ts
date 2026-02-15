import { useState, useRef, useCallback, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Haptics from 'expo-haptics';
import { schedulePomodoroNotification, cancelNotification } from './useNotifications';

export type TimerMode = 'focus' | 'break' | 'longBreak';

export interface TimerConfig {
  focusMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
}

export interface UseTimerReturn {
  timeLeft: number; // in seconds
  isRunning: boolean;
  mode: TimerMode;
  sessionsCompleted: number;
  progress: number; // 0 to 1
  formattedTime: string;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  setConfig: (config: Partial<TimerConfig>) => void;
}

const DEFAULT_CONFIG: TimerConfig = {
  focusMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
};

export function useTimer(
  onComplete?: (mode: TimerMode, sessionsCompleted: number) => void
): UseTimerReturn {
  const [config, setConfigState] = useState<TimerConfig>(DEFAULT_CONFIG);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_CONFIG.focusMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<TimerMode>('focus');
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  
  const endTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const notificationIdRef = useRef<string | null>(null);
  const appState = useRef(AppState.currentState);

  const totalSeconds = getModeDuration(mode, config) * 60;
  const progress = 1 - (timeLeft / totalSeconds);

  // Format time as MM:SS
  const formattedTime = formatTime(timeLeft);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground - recalculate time based on end time
      if (endTimeRef.current && isRunning) {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((endTimeRef.current - now) / 1000));
        setTimeLeft(remaining);
        
        if (remaining === 0) {
          handleTimerComplete();
        }
      }
    }
    appState.current = nextAppState;
  }, [isRunning]);

  // Timer tick
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        if (endTimeRef.current) {
          const remaining = Math.max(0, Math.floor((endTimeRef.current - now) / 1000));
          setTimeLeft(remaining);
          
          if (remaining === 0) {
            handleTimerComplete();
          }
        }
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, timeLeft]);

  const handleTimerComplete = useCallback(async () => {
    setIsRunning(false);
    endTimeRef.current = null;
    
    // Cancel the scheduled notification
    if (notificationIdRef.current) {
      await cancelNotification(notificationIdRef.current);
      notificationIdRef.current = null;
    }

    // Haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Update sessions and switch mode
    if (mode === 'focus') {
      const newSessions = sessionsCompleted + 1;
      setSessionsCompleted(newSessions);
      
      // Determine next mode
      if (newSessions % config.sessionsBeforeLongBreak === 0) {
        setMode('longBreak');
        setTimeLeft(config.longBreakMinutes * 60);
      } else {
        setMode('break');
        setTimeLeft(config.breakMinutes * 60);
      }
      
      onComplete?.('focus', newSessions);
    } else {
      // Break completed, back to focus
      setMode('focus');
      setTimeLeft(config.focusMinutes * 60);
      onComplete?.(mode, sessionsCompleted);
    }
  }, [mode, sessionsCompleted, config, onComplete]);

  const start = useCallback(async () => {
    if (timeLeft <= 0) return;

    setIsRunning(true);
    endTimeRef.current = Date.now() + (timeLeft * 1000);

    // Schedule notification
    try {
      const notifType = mode === 'focus' ? 'focus_end' : 'break_end';
      notificationIdRef.current = await schedulePomodoroNotification(notifType, timeLeft);
    } catch (e) {
      console.log('Could not schedule notification:', e);
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [timeLeft, mode]);

  const pause = useCallback(async () => {
    setIsRunning(false);
    endTimeRef.current = null;

    // Cancel scheduled notification
    if (notificationIdRef.current) {
      await cancelNotification(notificationIdRef.current);
      notificationIdRef.current = null;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const reset = useCallback(async () => {
    setIsRunning(false);
    endTimeRef.current = null;
    setTimeLeft(getModeDuration(mode, config) * 60);

    if (notificationIdRef.current) {
      await cancelNotification(notificationIdRef.current);
      notificationIdRef.current = null;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [mode, config]);

  const skip = useCallback(async () => {
    setIsRunning(false);
    endTimeRef.current = null;

    if (notificationIdRef.current) {
      await cancelNotification(notificationIdRef.current);
      notificationIdRef.current = null;
    }

    // Switch to next mode
    if (mode === 'focus') {
      const newSessions = sessionsCompleted + 1;
      setSessionsCompleted(newSessions);
      
      if (newSessions % config.sessionsBeforeLongBreak === 0) {
        setMode('longBreak');
        setTimeLeft(config.longBreakMinutes * 60);
      } else {
        setMode('break');
        setTimeLeft(config.breakMinutes * 60);
      }
    } else {
      setMode('focus');
      setTimeLeft(config.focusMinutes * 60);
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [mode, sessionsCompleted, config]);

  const setConfig = useCallback((newConfig: Partial<TimerConfig>) => {
    setConfigState(prev => {
      const updated = { ...prev, ...newConfig };
      // Update time if not running
      if (!isRunning) {
        setTimeLeft(getModeDuration(mode, updated) * 60);
      }
      return updated;
    });
  }, [isRunning, mode]);

  return {
    timeLeft,
    isRunning,
    mode,
    sessionsCompleted,
    progress,
    formattedTime,
    start,
    pause,
    reset,
    skip,
    setConfig,
  };
}

function getModeDuration(mode: TimerMode, config: TimerConfig): number {
  switch (mode) {
    case 'focus': return config.focusMinutes;
    case 'break': return config.breakMinutes;
    case 'longBreak': return config.longBreakMinutes;
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default useTimer;
