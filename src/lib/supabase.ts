import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

// Supabase JS owns the single persisted browser session and its token refreshes.
export const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true,
        },
      })
    : null;

export const isSupabaseConfigured = Boolean(supabase);