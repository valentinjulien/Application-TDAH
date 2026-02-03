import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

export const useEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEvents();

    // Real-time subscription
    const channel = supabase
      .channel('events_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
        },
        (payload) => {
          console.log('Event change received!', payload);
          fetchEvents(); // Refresh events on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setEvents([]);
        return;
      }

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: true });

      if (error) throw error;

      setEvents(data || []);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Petit souci pour synchroniser vos événements.');
    } finally {
      setLoading(false);
    }
  };

  const addEvent = async (eventData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('events')
        .insert([{ ...eventData, user_id: user.id }])
        .select();

      if (error) throw error;

      // Events will be updated via real-time subscription
      return data[0];
    } catch (err) {
      console.error('Error adding event:', err);
      setError('Impossible d\'ajouter l\'événement.');
      throw err;
    }
  };

  const updateEvent = async (eventId, updates) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', eventId)
        .select();

      if (error) throw error;

      // Events will be updated via real-time subscription
      return data[0];
    } catch (err) {
      console.error('Error updating event:', err);
      setError('Impossible de modifier l\'événement.');
      throw err;
    }
  };

  const deleteEvent = async (eventId) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      // Events will be updated via real-time subscription
    } catch (err) {
      console.error('Error deleting event:', err);
      setError('Impossible de supprimer l\'événement.');
      throw err;
    }
  };

  return {
    events,
    loading,
    error,
    addEvent,
    updateEvent,
    deleteEvent,
    refetch: fetchEvents,
  };
};