import { supabase } from '../services/supabaseClient';

export const testSupabaseConnection = async () => {
  try {
    // Test basic connection
    const { data, error } = await supabase.from('tasks').select('count').limit(1);
    if (error) throw error;

    console.log('✅ Connexion Supabase réussie');
    return { success: true, message: 'Connexion établie avec succès' };
  } catch (error) {
    console.error('❌ Erreur de connexion Supabase:', error);
    return { success: false, message: `Erreur de connexion: ${error?.message || 'Erreur inconnue'}` };
  }
};

export const initializeUserData = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Utilisateur non connecté');

    // Check if profile exists, create if not
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code === 'PGRST116') {
      // Profile doesn't exist, create it
      const { error: insertError } = await supabase
        .from('profiles')
        .insert([{
          id: user.id,
          notification_buffer: 15,
          energy_level: 'medium'
        }]);

      if (insertError) throw insertError;
      console.log('✅ Profil utilisateur créé');
    }

    return { success: true, message: 'Données utilisateur initialisées' };
  } catch (error) {
    console.error('❌ Erreur d\'initialisation:', error);
    return { success: false, message: `Erreur d'initialisation: ${error?.message || 'Erreur inconnue'}` };
  }
};