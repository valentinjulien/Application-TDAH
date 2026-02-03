import { gapi } from 'gapi-script';

// Initialize Google API
export const initGoogleAPI = () => {
  return new Promise((resolve, reject) => {
    gapi.load('client:auth2', () => {
      gapi.client.init({
        apiKey: process.env.REACT_APP_GOOGLE_API_KEY,
        clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
        scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly',
      }).then(() => {
        resolve();
      }).catch(reject);
    });
  });
};

// Authenticate user
export const signIn = () => {
  return gapi.auth2.getAuthInstance().signIn();
};

// Sign out
export const signOut = () => {
  return gapi.auth2.getAuthInstance().signOut();
};

// Check if signed in
export const isSignedIn = () => {
  return gapi.auth2.getAuthInstance().isSignedIn.get();
};

// Sync events from next 24 hours
export const syncGoogleEvents = async () => {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const response = await gapi.client.calendar.events.list({
    calendarId: 'primary',
    timeMin: now.toISOString(),
    timeMax: tomorrow.toISOString(),
    showDeleted: false,
    singleEvents: true,
    orderBy: 'startTime',
  });

  return response.result.items.map(event => ({
    id: event.id,
    title: event.summary,
    start: event.start.dateTime || event.start.date,
    end: event.end.dateTime || event.end.date,
    description: event.description,
  }));
};

// Create event
export const createGoogleEvent = async (eventData) => {
  const event = {
    summary: eventData.title,
    description: eventData.description,
    start: {
      dateTime: eventData.start,
      timeZone: 'Europe/Paris', // Adjust as needed
    },
    end: {
      dateTime: eventData.end,
      timeZone: 'Europe/Paris',
    },
  };

  const response = await gapi.client.calendar.events.insert({
    calendarId: 'primary',
    resource: event,
  });

  return response.result;
};