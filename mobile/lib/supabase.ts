import 'react-native-url-polyfill/dist/setup';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fkkjlkliksnujqsujzae.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZra2psa2xpa3NudWpxc3VqemFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3Njc4NTYsImV4cCI6MjA3ODM0Mzg1Nn0.LIGPH9YfFtZ8d0NOxH0DChBBilpqgcjuXffPTIXGx6Q';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Types pour les tables
export interface TaskStep {
  id: number;
  text: string;
  done: boolean;
}

export interface Task {
  id: string;
  user_id: string;
  text: string;
  priority: 'high' | 'medium' | 'low';
  quadrant: 1 | 2 | 3 | 4;
  completed: boolean;
  created_at: string;
  due_date?: string;
  source?: string;
  steps?: TaskStep[]; // JSONB column for micro-planning
}

export interface Mood {
  id: string;
  user_id: string;
  mood_level: number;
  energy_level: number;
  notes?: string;
  created_at: string;
}

export interface PomodoroSession {
  id: string;
  user_id: string;
  duration_minutes: number;
  break_minutes: number;
  completed: boolean;
  created_at: string;
}

// Daily Logs for Gazette and Review
export interface DailyLog {
  id: string;
  user_id: string;
  date: string;
  type: 'morning_gazette' | 'evening_review' | 'focus_session';
  content: {
    // Morning Gazette
    victoire_du_jour?: {
      task_id: string;
      titre: string;
      raison: string;
    };
    etape_zero?: {
      action: string;
      emoji: string;
    };
    // Evening Review
    notes_journal?: string;
    celebration?: string;
    tasks_created?: number;
    // Focus Session
    focus_completed?: boolean;
    duration_minutes?: number;
  };
  created_at: string;
}

// Helper functions
export const getTasks = async (userId: string): Promise<Task[]> => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return (data || []) as Task[];
};

export const createTask = async (task: Omit<Task, 'id' | 'created_at'>): Promise<Task> => {
  const { data, error } = await supabase
    .from('tasks')
    .insert(task)
    .select()
    .single();
  
  if (error) throw error;
  return data as Task;
};

export const updateTask = async (id: string, updates: Partial<Task>): Promise<Task> => {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data as Task;
};

export const deleteTask = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

export const subscribeToTasks = (
  userId: string,
  callback: (tasks: Task[]) => void
) => {
  return supabase
    .channel('tasks-channel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `user_id=eq.${userId}`,
      },
      async () => {
        // Refetch all tasks on any change
        const tasks = await getTasks(userId);
        callback(tasks);
      }
    )
    .subscribe();
};

// Daily Logs functions
export const createDailyLog = async (log: Omit<DailyLog, 'id' | 'created_at'>): Promise<DailyLog> => {
  const { data, error } = await supabase
    .from('daily_logs')
    .insert(log)
    .select()
    .single();
  
  if (error) throw error;
  return data as DailyLog;
};

export const getDailyLogs = async (userId: string, days: number = 7): Promise<DailyLog[]> => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const { data, error } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: false });
  
  if (error) throw error;
  return (data || []) as DailyLog[];
};

export const getTodayLog = async (userId: string, type: 'morning_gazette' | 'evening_review'): Promise<DailyLog | null> => {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .eq('type', type)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data as DailyLog | null;
};

export default supabase;
