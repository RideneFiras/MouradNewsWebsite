import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from '@/lib/env';
import { serverEnv } from '@/lib/env.server';

let client: SupabaseClient | null = null;

/**
 * SERVICE ROLE client — bypasses RLS. Only for: analytics/ad ingestion routes,
 * staff invites and deactivation, preview rendering, contact form storage.
 * Never import from a client component or a shared module.
 */
export function adminClient(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, serverEnv.serviceRoleKey(), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
    });
  }
  return client;
}
