import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://rmqkvglixdiwlunqaoue.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcWt2Z2xpeGRpd2x1bnFhb3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1Mjg3MTIsImV4cCI6MjA4NTEwNDcxMn0.UaYcJHR07O1tBBmHx1kaMqa3HAOgYSV-XnxkSWvN7Vw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth functions
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
  return { data, error };
};

export const signInWithEmail = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signUpWithEmail = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = () => {
  return supabase.auth.getUser();
};

export const getAuthDiagnostics = async () => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    return {
      user: user ? { id: user.id, email: user.email } : null,
      session: session ? { access_token: '***', expires_at: session.expires_at } : null,
      errors: {
        user: userError?.message,
        session: sessionError?.message,
      },
      supabaseUrl: supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
    };
  } catch (error) {
    return { error: error.message };
  }
};