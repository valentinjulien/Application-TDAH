import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';

interface DailyTriggerState {
  shouldShowMorningGazette: boolean;
  shouldShowEveningReview: boolean;
  morningWindow: boolean; // 7h - 10h
  eveningWindow: boolean; // 21h - 23h
}

const GAZETTE_KEY = 'morning_gazette_seen';
const REVIEW_KEY = 'evening_review_seen';

export function useDailyTriggers() {
  const [state, setState] = useState<DailyTriggerState>({
    shouldShowMorningGazette: false,
    shouldShowEveningReview: false,
    morningWindow: false,
    eveningWindow: false,
  });

  const appState = useRef(AppState.currentState);

  const checkTriggers = useCallback(async () => {
    const hour = new Date().getHours();
    const today = new Date().toDateString();

    // Check time windows
    const inMorningWindow = hour >= 7 && hour <= 10;
    const inEveningWindow = hour >= 21 && hour <= 23;

    // Check if already seen today
    const gazetteSeen = await AsyncStorage.getItem(GAZETTE_KEY);
    const reviewSeen = await AsyncStorage.getItem(REVIEW_KEY);

    const hasSeenGazetteToday = gazetteSeen === today;
    const hasSeenReviewToday = reviewSeen === today;

    setState({
      shouldShowMorningGazette: inMorningWindow && !hasSeenGazetteToday,
      shouldShowEveningReview: inEveningWindow && !hasSeenReviewToday,
      morningWindow: inMorningWindow,
      eveningWindow: inEveningWindow,
    });
  }, []);

  // Check on mount
  useEffect(() => {
    checkTriggers();
  }, [checkTriggers]);

  // Check when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground
        checkTriggers();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [checkTriggers]);

  // Recheck periodically (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(checkTriggers, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkTriggers]);

  const markGazetteSeen = useCallback(async () => {
    const today = new Date().toDateString();
    await AsyncStorage.setItem(GAZETTE_KEY, today);
    setState(prev => ({ ...prev, shouldShowMorningGazette: false }));
  }, []);

  const markReviewSeen = useCallback(async () => {
    const today = new Date().toDateString();
    await AsyncStorage.setItem(REVIEW_KEY, today);
    setState(prev => ({ ...prev, shouldShowEveningReview: false }));
  }, []);

  // Reset functions for testing
  const resetGazette = useCallback(async () => {
    await AsyncStorage.removeItem(GAZETTE_KEY);
    checkTriggers();
  }, [checkTriggers]);

  const resetReview = useCallback(async () => {
    await AsyncStorage.removeItem(REVIEW_KEY);
    checkTriggers();
  }, [checkTriggers]);

  return {
    ...state,
    markGazetteSeen,
    markReviewSeen,
    resetGazette,
    resetReview,
    refresh: checkTriggers,
  };
}

// Utility to check current time slot
export function getCurrentTimeSlot(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

// Get greeting based on time
export function getTimeBasedGreeting(): string {
  const slot = getCurrentTimeSlot();
  
  switch (slot) {
    case 'morning':
      return 'Bonjour ☀️';
    case 'afternoon':
      return 'Bon après-midi 🌤️';
    case 'evening':
      return 'Bonsoir 🌅';
    case 'night':
      return 'Bonne nuit 🌙';
  }
}

export default useDailyTriggers;
