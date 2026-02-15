// Google Calendar Hook - Manages OAuth flow and calendar state
import { useState, useEffect, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import {
  useGoogleAuth,
  exchangeCodeForTokens,
  isGoogleCalendarConnected,
  disconnectGoogleCalendar,
  getConnectedEmail,
  getBusySlots,
  createCalendarEvent,
  taskToCalendarEvent,
  BusySlot,
} from '../services/googleCalendarService';

export interface UseGoogleCalendarReturn {
  isConnected: boolean;
  isLoading: boolean;
  userEmail: string | null;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  syncTaskToCalendar: (
    taskText: string,
    scheduledAt: Date,
    durationMinutes: number,
    energyLevel?: 'low' | 'medium' | 'high'
  ) => Promise<string | null>;
  fetchBusySlots: (timeMin: Date, timeMax: Date) => Promise<BusySlot[]>;
}

export function useGoogleCalendar(): UseGoogleCalendarReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { request, response, promptAsync } = useGoogleAuth();

  // Check connection status on mount
  useEffect(() => {
    checkConnectionStatus();
  }, []);

  // Handle OAuth response
  useEffect(() => {
    if (response?.type === 'success' && response.params.code) {
      handleAuthCode(response.params.code);
    } else if (response?.type === 'error') {
      setError('Échec de l\'authentification Google');
      setIsLoading(false);
    }
  }, [response]);

  const checkConnectionStatus = async () => {
    try {
      const connected = await isGoogleCalendarConnected();
      setIsConnected(connected);

      if (connected) {
        const email = await getConnectedEmail();
        setUserEmail(email);
      }
    } catch (e) {
      console.error('Error checking connection:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthCode = async (code: string) => {
    setIsLoading(true);
    setError(null);

    try {
      if (!request?.codeVerifier) {
        throw new Error('Code verifier missing');
      }

      const redirectUri = request.redirectUri;
      const tokens = await exchangeCodeForTokens(code, request.codeVerifier, redirectUri);

      setIsConnected(true);
      setUserEmail(tokens.userEmail || null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      console.error('Error exchanging code:', e);
      setError(e.message || 'Erreur de connexion');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const connect = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await promptAsync();
    } catch (e: any) {
      console.error('Error starting OAuth:', e);
      setError(e.message || 'Erreur de démarrage OAuth');
      setIsLoading(false);
    }
  }, [promptAsync]);

  const disconnect = useCallback(async () => {
    setIsLoading(true);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await disconnectGoogleCalendar();
      setIsConnected(false);
      setUserEmail(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      console.error('Error disconnecting:', e);
      setError(e.message || 'Erreur de déconnexion');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const syncTaskToCalendar = useCallback(
    async (
      taskText: string,
      scheduledAt: Date,
      durationMinutes: number,
      energyLevel?: 'low' | 'medium' | 'high'
    ): Promise<string | null> => {
      if (!isConnected) {
        setError('Non connecté à Google Calendar');
        return null;
      }

      try {
        const event = taskToCalendarEvent(taskText, scheduledAt, durationMinutes, energyLevel);
        const createdEvent = await createCalendarEvent(event);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return createdEvent.id || null;
      } catch (e: any) {
        console.error('Error syncing to calendar:', e);
        setError(e.message || 'Erreur de synchronisation');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return null;
      }
    },
    [isConnected]
  );

  const fetchBusySlots = useCallback(
    async (timeMin: Date, timeMax: Date): Promise<BusySlot[]> => {
      if (!isConnected) return [];

      try {
        return await getBusySlots(timeMin, timeMax);
      } catch (e: any) {
        console.error('Error fetching busy slots:', e);
        return [];
      }
    },
    [isConnected]
  );

  return {
    isConnected,
    isLoading,
    userEmail,
    error,
    connect,
    disconnect,
    syncTaskToCalendar,
    fetchBusySlots,
  };
}

export default useGoogleCalendar;
