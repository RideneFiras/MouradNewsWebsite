import { createClient } from '@supabase/supabase-js';
import { loadEnvLocal } from '../support/load-env';

// Local Supabase (supabase start). Keys come from .env.local (see docs/HANDOFF.md).
loadEnvLocal();
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
export const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
export const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const service = () => createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

/** Waits until a cached page shows the expected content (ISR: up to 60 s; we revalidate on demand). */
export async function revalidate(baseURL: string, tags: string[] = ['articles']) {
  await fetch(`${baseURL}/api/revalidate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-revalidate-secret': process.env.REVALIDATE_SECRET ?? 'local-dev-revalidate-secret' },
    body: JSON.stringify({ tags }),
  });
}
