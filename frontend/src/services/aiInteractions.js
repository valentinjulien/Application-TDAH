import { supabase } from '../services/supabaseClient';

export const addAiInteraction = async (message, response, type = 'chat') => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('ai_conversations')
      .insert([{
        user_id: user.id,
        message,
        response,
        type,
        created_at: new Date().toISOString(),
      }]);

    if (error) throw error;

    return data[0];
  } catch (err) {
    console.error('Error adding AI interaction:', err);
    throw err;
  }
};