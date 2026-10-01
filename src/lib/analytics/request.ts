import 'server-only';
import { isbot } from 'isbot';

/** Logged-in staff carry the Supabase auth cookie; readers never do (no reader accounts). */
export function hasStaffSession(cookieHeader: string | null): boolean {
  return /(?:^|;\s*)sb-[^=;]*-auth-token(?:\.\d+)?=/.test(cookieHeader ?? '');
}

export function isBotRequest(ua: string | null): boolean {
  return !ua || ua.length < 10 || isbot(ua);
}

export function countryOf(headers: Headers): string {
  const c = (headers.get('cf-ipcountry') ?? '').toUpperCase();
  return /^[A-Z]{2}$/.test(c) && c !== 'T1' ? c : 'XX';
}
