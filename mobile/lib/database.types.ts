export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string
          user_id: string
          text: string
          priority: 'high' | 'medium' | 'low'
          quadrant: number
          completed: boolean
          created_at: string
          due_date: string | null
          source: string | null
        }
        Insert: {
          id?: string
          user_id: string
          text: string
          priority?: 'high' | 'medium' | 'low'
          quadrant?: number
          completed?: boolean
          created_at?: string
          due_date?: string | null
          source?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          text?: string
          priority?: 'high' | 'medium' | 'low'
          quadrant?: number
          completed?: boolean
          created_at?: string
          due_date?: string | null
          source?: string | null
        }
      }
      moods: {
        Row: {
          id: string
          user_id: string
          mood_level: number
          energy_level: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          mood_level: number
          energy_level: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          mood_level?: number
          energy_level?: number
          notes?: string | null
          created_at?: string
        }
      }
      pomodoro_sessions: {
        Row: {
          id: string
          user_id: string
          duration_minutes: number
          break_minutes: number
          completed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          duration_minutes?: number
          break_minutes?: number
          completed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          duration_minutes?: number
          break_minutes?: number
          completed?: boolean
          created_at?: string
        }
      }
    }
  }
}