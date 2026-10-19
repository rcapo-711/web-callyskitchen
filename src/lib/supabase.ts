import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  ''

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl && 
    supabaseUrl.startsWith('http') &&
    supabaseUrl !== 'https://icnbtgkzzocjgjosenca.supabase.co' && 
    supabaseAnonKey && 
    supabaseAnonKey.length > 20
  )
}

let clientInstance: SupabaseClient | null = null

export const getSupabase = (): SupabaseClient => {
  if (!clientInstance) {
    if (!isSupabaseConfigured()) {
      console.warn(
        '[Calls Kitchen] Supabase anon key is not yet configured. The app will use local state mode. Add VITE_SUPABASE_ANON_KEY to .env to connect to live Supabase backend.'
      )
    }
    clientInstance = createClient(
      supabaseUrl || 'https://icnbtgkzzocjgjosenca.supabase.co', 
      supabaseAnonKey || 'sb_publishable_eyMFNL1fGiVw6IqCBy6DeQ_WNzIJXDX', 
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }
    )
  }
  return clientInstance
}

export const supabase = getSupabase()
