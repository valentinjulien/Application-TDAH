import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

export const useTasks = (quadrant = null) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTasks();

    // Real-time subscription
    const channel = supabase
      .channel('tasks_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: quadrant ? `quadrant=eq.${quadrant}` : undefined,
        },
        (payload) => {
          console.log('Change received!', payload);
          fetchTasks(); // Refresh tasks on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [quadrant]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setTasks([]);
        return;
      }

      let query = supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (quadrant) {
        query = query.eq('quadrant', quadrant);
      }

      const { data, error } = await query;

      if (error) throw error;

      setTasks(data || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError('Petit souci de connexion, on réessaie dans un instant...');
    } finally {
      setLoading(false);
    }
  };

  const addTask = async (taskData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('tasks')
        .insert([{ ...taskData, user_id: user.id }])
        .select();

      if (error) throw error;

      // Tasks will be updated via real-time subscription
      return data[0];
    } catch (err) {
      console.error('Error adding task:', err);
      setError('Impossible d\'ajouter la tâche pour le moment.');
      throw err;
    }
  };

  const updateTask = async (taskId, updates) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select();

      if (error) throw error;

      // Tasks will be updated via real-time subscription
      return data[0];
    } catch (err) {
      console.error('Error updating task:', err);
      setError('Impossible de modifier la tâche pour le moment.');
      throw err;
    }
  };

  const deleteTask = async (taskId) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      // Tasks will be updated via real-time subscription
    } catch (err) {
      console.error('Error deleting task:', err);
      setError('Impossible de supprimer la tâche pour le moment.');
      throw err;
    }
  };

  return {
    tasks,
    loading,
    error,
    addTask,
    updateTask,
    deleteTask,
    refetch: fetchTasks,
  };
};