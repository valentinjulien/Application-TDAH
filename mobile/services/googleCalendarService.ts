// Google Calendar Service for Expo
// Handles OAuth authentication and calendar operations

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Complete the auth session for web
WebBrowser.maybeCompleteAuthSession();

// OAuth Client IDs per platform
const CLIENT_IDS = {
  web: '632614578720-tc039dtqgf5nkrttgtn5020sv2qebpbo.apps.googleusercontent.com',
  android: '632614578720-l0tmejp3k9t0v6tv64n79c8idbl9lo3n.apps.googleusercontent.com',
  ios: '632614578720-58a14nm10u5nc5eiolntc0om61og2vrs.apps.googleusercontent.com',
};

// Get the correct client ID for the current platform
const getClientId = () => {
  if (Platform.OS === 'ios') return CLIENT_IDS.ios;
  if (Platform.OS === 'android') return CLIENT_IDS.android;
  return CLIENT_IDS.web;
};

// Discovery document for Google OAuth
const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

// Scopes for Calendar access
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
];

// Storage keys
const STORAGE_KEYS = {
  accessToken: 'google_access_token',
  refreshToken: 'google_refresh_token',
  tokenExpiry: 'google_token_expiry',
  userEmail: 'google_user_email',
};

export interface GoogleTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  userEmail?: string;
}

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  colorId?: string;
}

export interface BusySlot {
  start: Date;
  end: Date;
}

// ============================================
// AUTHENTICATION
// ============================================

export function useGoogleAuth() {
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'assistant-tdah',
    path: 'oauth/callback',
  });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: getClientId(),
      scopes: SCOPES,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      extraParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
    discovery
  );

  return { request, response, promptAsync, redirectUri };
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<GoogleTokens> {
  const clientId = getClientId();

  const response = await fetch(discovery.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      code,
      code_verifier: codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
  }

  const data = await response.json();

  // Get user email
  const userInfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${data.access_token}` },
  }).then(r => r.json());

  const tokens: GoogleTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
    userEmail: userInfo.email,
  };

  // Save tokens
  await saveTokens(tokens);

  return tokens;
}

// Refresh access token
export async function refreshAccessToken(): Promise<GoogleTokens | null> {
  const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.refreshToken);
  if (!refreshToken) return null;

  try {
    const response = await fetch(discovery.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: getClientId(),
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();

    const tokens: GoogleTokens = {
      accessToken: data.access_token,
      refreshToken: refreshToken, // Keep existing refresh token
      expiresAt: Date.now() + (data.expires_in * 1000),
      userEmail: await AsyncStorage.getItem(STORAGE_KEYS.userEmail) || undefined,
    };

    await saveTokens(tokens);
    return tokens;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

// Get valid access token (auto-refresh if needed)
export async function getValidAccessToken(): Promise<string | null> {
  const accessToken = await AsyncStorage.getItem(STORAGE_KEYS.accessToken);
  const expiresAt = await AsyncStorage.getItem(STORAGE_KEYS.tokenExpiry);

  if (!accessToken) return null;

  // Check if token is expired (with 5 min buffer)
  const expiryTime = expiresAt ? parseInt(expiresAt, 10) : 0;
  if (Date.now() > expiryTime - 300000) {
    // Token expired or expiring soon, refresh it
    const newTokens = await refreshAccessToken();
    return newTokens?.accessToken || null;
  }

  return accessToken;
}

// Save tokens to storage
async function saveTokens(tokens: GoogleTokens): Promise<void> {
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.accessToken, tokens.accessToken],
    [STORAGE_KEYS.tokenExpiry, tokens.expiresAt.toString()],
    ...(tokens.refreshToken ? [[STORAGE_KEYS.refreshToken, tokens.refreshToken]] : []),
    ...(tokens.userEmail ? [[STORAGE_KEYS.userEmail, tokens.userEmail]] : []),
  ] as [string, string][]);
}

// Check if connected to Google Calendar
export async function isGoogleCalendarConnected(): Promise<boolean> {
  const token = await getValidAccessToken();
  return !!token;
}

// Disconnect from Google Calendar
export async function disconnectGoogleCalendar(): Promise<void> {
  const accessToken = await AsyncStorage.getItem(STORAGE_KEYS.accessToken);

  // Revoke token
  if (accessToken) {
    try {
      await fetch(`${discovery.revocationEndpoint}?token=${accessToken}`, {
        method: 'POST',
      });
    } catch (e) {
      console.error('Error revoking token:', e);
    }
  }

  // Clear storage
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.accessToken,
    STORAGE_KEYS.refreshToken,
    STORAGE_KEYS.tokenExpiry,
    STORAGE_KEYS.userEmail,
  ]);
}

// Get connected user email
export async function getConnectedEmail(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.userEmail);
}

// ============================================
// CALENDAR OPERATIONS
// ============================================

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

// Get upcoming events
export async function getCalendarEvents(
  maxResults: number = 20,
  timeMin?: Date
): Promise<CalendarEvent[]> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) throw new Error('Not authenticated with Google');

  const params = new URLSearchParams({
    maxResults: maxResults.toString(),
    timeMin: (timeMin || new Date()).toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
  });

  const response = await fetch(
    `${CALENDAR_API_BASE}/calendars/primary/events?${params}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch events: ${response.status}`);
  }

  const data = await response.json();
  return data.items || [];
}

// Get busy time slots (for scheduling)
export async function getBusySlots(
  timeMin: Date,
  timeMax: Date
): Promise<BusySlot[]> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) throw new Error('Not authenticated with Google');

  const response = await fetch(`${CALENDAR_API_BASE}/freeBusy`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: 'primary' }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch busy slots: ${response.status}`);
  }

  const data = await response.json();
  const busy = data.calendars?.primary?.busy || [];

  return busy.map((slot: { start: string; end: string }) => ({
    start: new Date(slot.start),
    end: new Date(slot.end),
  }));
}

// Create calendar event
export async function createCalendarEvent(event: CalendarEvent): Promise<CalendarEvent> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) throw new Error('Not authenticated with Google');

  const response = await fetch(`${CALENDAR_API_BASE}/calendars/primary/events`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: event.summary,
      description: event.description,
      start: {
        dateTime: event.start.dateTime,
        timeZone: event.start.timeZone || 'Europe/Paris',
      },
      end: {
        dateTime: event.end.dateTime,
        timeZone: event.end.timeZone || 'Europe/Paris',
      },
      colorId: event.colorId,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 10 },
        ],
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create event: ${error.error?.message || response.status}`);
  }

  return response.json();
}

// Update calendar event
export async function updateCalendarEvent(
  eventId: string,
  updates: Partial<CalendarEvent>
): Promise<CalendarEvent> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) throw new Error('Not authenticated with Google');

  const response = await fetch(
    `${CALENDAR_API_BASE}/calendars/primary/events/${eventId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to update event: ${response.status}`);
  }

  return response.json();
}

// Delete calendar event
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) throw new Error('Not authenticated with Google');

  const response = await fetch(
    `${CALENDAR_API_BASE}/calendars/primary/events/${eventId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok && response.status !== 204) {
    throw new Error(`Failed to delete event: ${response.status}`);
  }
}

// ============================================
// HELPER: Create event from task
// ============================================

export function taskToCalendarEvent(
  taskText: string,
  scheduledAt: Date,
  durationMinutes: number,
  energyLevel?: 'low' | 'medium' | 'high'
): CalendarEvent {
  const endTime = new Date(scheduledAt.getTime() + durationMinutes * 60000);

  // Color based on energy level (Google Calendar color IDs)
  // 1=Lavender, 2=Sage, 3=Grape, 4=Flamingo, 5=Banana, 6=Tangerine, 7=Peacock, 9=Blueberry, 10=Basil, 11=Tomato
  let colorId = '7'; // Default: Peacock (blue)
  if (energyLevel === 'high') colorId = '11'; // Tomato (red) for high energy
  else if (energyLevel === 'low') colorId = '2'; // Sage (green) for low energy

  return {
    summary: `🎯 ${taskText}`,
    description: `Tâche Assistant TDAH\nNiveau d'énergie: ${energyLevel || 'medium'}`,
    start: {
      dateTime: scheduledAt.toISOString(),
      timeZone: 'Europe/Paris',
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: 'Europe/Paris',
    },
    colorId,
  };
}

export default {
  useGoogleAuth,
  exchangeCodeForTokens,
  isGoogleCalendarConnected,
  disconnectGoogleCalendar,
  getConnectedEmail,
  getCalendarEvents,
  getBusySlots,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  taskToCalendarEvent,
};
