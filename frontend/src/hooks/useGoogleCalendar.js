import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setConnected, setEvents, setLoading } from '../features/calendarSlice';
import { initGoogleAPI, signIn, signOut, isSignedIn, syncGoogleEvents, createGoogleEvent } from '../services/googleCalendar';

export const useGoogleCalendar = () => {
  const dispatch = useDispatch();
  const { isConnected, events, loading } = useSelector(state => state.calendar);
  const [error, setError] = useState(null);

  useEffect(() => {
    initGoogleAPI().then(() => {
      const auth = window.gapi.auth2.getAuthInstance();
      auth.isSignedIn.listen(updateSigninStatus);
      updateSigninStatus(auth.isSignedIn.get());
    }).catch((err) => {
      console.error('Erreur d\'initialisation Google API:', err);
      setError('Erreur d\'initialisation de Google Calendar');
    });
  }, []);

  const updateSigninStatus = (isSignedIn) => {
    dispatch(setConnected(isSignedIn));
    if (isSignedIn) {
      syncEvents();
    }
  };

  const handleSignIn = async () => {
    try {
      setError(null);
      dispatch(setLoading(true));
      await signIn();
    } catch (err) {
      setError('Erreur de connexion à Google Calendar');
      dispatch(setLoading(false));
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      dispatch(setEvents([]));
    } catch (err) {
      setError('Erreur de déconnexion');
    }
  };

  const syncEvents = async () => {
    try {
      dispatch(setLoading(true));
      const events = await syncGoogleEvents();
      dispatch(setEvents(events));
    } catch (err) {
      setError('Erreur de synchronisation des événements');
    } finally {
      dispatch(setLoading(false));
    }
  };

  const createEvent = async (eventData) => {
    try {
      const event = await createGoogleEvent(eventData);
      dispatch(setEvents([...events, {
        id: event.id,
        title: event.summary,
        start: event.start.dateTime,
        end: event.end.dateTime,
        description: event.description,
      }]));
      return event;
    } catch (err) {
      setError('Erreur de création d\'événement');
      throw err;
    }
  };

  return {
    isConnected,
    events,
    loading,
    error,
    signIn: handleSignIn,
    signOut: handleSignOut,
    syncEvents,
    createEvent,
  };
};