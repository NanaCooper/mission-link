// The one Supabase client for online play.
// Keys come from .env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY). Never put keys in code.
// The client is made only when online play starts, so split mode never touches the network.

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env?.VITE_SUPABASE_URL;
const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

/** True when both keys are set. If false, only split mode can work. */
export const hasSupabase = Boolean(url && anonKey);

let client = null;

export function getSupabase() {
  if (!hasSupabase) throw new Error('Supabase keys are missing from .env');
  if (!client) {
    // We only use Realtime (no logins), so do not store any auth session.
    client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
