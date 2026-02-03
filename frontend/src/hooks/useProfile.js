import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

export const useProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"

      setProfile(data || {
        id: user.id,
        notification_buffer: 15,
        energy_level: 'medium',
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Petit souci pour récupérer vos préférences.');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, ...updates })
        .select();

      if (error) throw error;

      setProfile(data[0]);
      return data[0];
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Impossible de sauvegarder vos préférences.');
      throw err;
    }
  };

  return {
    profile,
    loading,
    error,
    updateProfile,
    refetch: fetchProfile,
  };
};