import { useState, useCallback } from 'react';

export const useEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const addEvent = useCallback(async (eventData) => {
    setLoading(true);
    try {
      const newEvent = {
        id: Date.now().toString(),
        ...eventData,
        created_at: new Date().toISOString(),
      };
      setEvents(prev => [...prev, newEvent]);
      return newEvent;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    events,
    loading,
    addEvent,
  };
};

export default useEvents;
