import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { sessionClient } from '@/lib/supabase/server';

export type AppRole = 'admin' | 'editor' | 'author';

export interface Staff {
  id: string;
  email: string;
  role: AppRole;
  is_active: boolean;
  display_name_ar: string;
  display_name_fr: string | null;
  slug: string;
  ui_locale: 'ar' | 'fr';
  avatar_media_id: string | null;
}

/** The logged-in, active staff member (or null). Cached per request. */
export const getStaff = cache(async (): Promise<Staff | null> => {
  const db = await sessionClient();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return null;
  const { data: p } = await db
    .from('profiles')
    .select('id, role, is_active, display_name_ar, display_name_fr, slug, ui_locale, avatar_media_id')
    .eq('id', auth.user.id)
    .maybeSingle();
  if (!p || !p.is_active) return null;
  return { ...(p as Omit<Staff, 'email'>), email: auth.user.email ?? '' };
});

export const isEditor = (s: Pick<Staff, 'role'>) => s.role === 'editor' || s.role === 'admin';
export const isAdmin = (s: Pick<Staff, 'role'>) => s.role === 'admin';

/** For admin pages: logged-in staff with one of the roles, else redirect. */
export async function requireStaff(locale: string, roles?: AppRole[]): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) redirect(`/${locale}/admin/login`);
  if (roles && !roles.includes(staff.role)) redirect(`/${locale}/admin`);
  return staff;
}

export class ActionError extends Error {
  constructor(public code: string, public field?: string) {
    super(code);
  }
}

/** For server actions: throws ActionError('not_allowed') unless the role matches. */
export async function assertStaff(roles?: AppRole[]): Promise<Staff> {
  const staff = await getStaff();
  if (!staff || (roles && !roles.includes(staff.role))) throw new ActionError('not_allowed');
  return staff;
}

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string; field?: string };

/** Wraps a server action body: role errors, zod errors and DB errors become a plain result. */
export async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (e) {
    if (e instanceof ActionError) return { ok: false, error: e.code, field: e.field };
    if (e && typeof e === 'object' && 'digest' in e && String((e as { digest: unknown }).digest).startsWith('NEXT_')) throw e; // redirect/notFound
    console.error('admin action failed', { message: e instanceof Error ? e.message : String(e) });
    const msg = e instanceof Error ? e.message : '';
    if (/not_allowed|42501|row-level security|permission denied|author_not_allowed/.test(msg)) return { ok: false, error: 'not_allowed' };
    return { ok: false, error: 'error' };
  }
}

/** Like check(), for .single(): also throws when no row came back. */
export function one<T>(res: { data: T; error: { message: string; code?: string } | null }): NonNullable<T> {
  if (res.error) throw new Error(`${res.error.code ?? ''} ${res.error.message}`);
  if (res.data == null) throw new ActionError('not_found');
  return res.data as NonNullable<T>;
}

/** Throws on a Supabase error so `run` can report it. */
export function check<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) throw new Error(`${res.error.code ?? ''} ${res.error.message}`);
  return res.data;
}
