'use client';
import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env';

/** Browser client for the admin only (uploads to Storage). Never used on public pages. */
export function browserClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
