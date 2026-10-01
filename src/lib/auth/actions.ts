'use server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { sessionClient } from '@/lib/supabase/server';
import { siteUrl } from '@/lib/env';

export async function loginAction(_: unknown, form: FormData): Promise<{ error?: string }> {
  const parsed = z.object({ email: z.string().trim().email(), password: z.string().min(1), locale: z.enum(['ar', 'fr']), next: z.string().optional() })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: 'badLogin' };
  const db = await sessionClient();
  const { data, error } = await db.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error || !data.user) return { error: 'badLogin' };
  const { data: p } = await db.from('profiles').select('is_active, ui_locale').eq('id', data.user.id).maybeSingle();
  if (!p) {
    await db.auth.signOut();
    return { error: 'noProfile' };
  }
  if (!p.is_active) {
    await db.auth.signOut();
    return { error: 'inactive' };
  }
  const next = parsed.data.next && /^\/(ar|fr)\/admin(\/|$)/.test(parsed.data.next) ? parsed.data.next : `/${p.ui_locale ?? parsed.data.locale}/admin`;
  redirect(next);
}

export async function forgotAction(_: unknown, form: FormData): Promise<{ sent?: boolean }> {
  const email = String(form.get('email') ?? '').trim();
  const locale = form.get('locale') === 'fr' ? 'fr' : 'ar';
  if (z.string().email().safeParse(email).success) {
    const db = await sessionClient();
    await db.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl()}/api/auth/callback?next=/${locale}/admin/reset` });
  }
  return { sent: true }; // same answer whether or not the address exists
}

export async function logoutAction(form: FormData) {
  const locale = form.get('locale') === 'fr' ? 'fr' : 'ar';
  const db = await sessionClient();
  await db.auth.signOut();
  redirect(`/${locale}/admin/login`);
}

/** Sets a new password after an e-mail link. Invites put the session tokens in the URL
 * hash (implicit flow): they are passed here and turned into a cookie session first. */
export async function setNewPasswordAction(input: { password: string; access_token?: string; refresh_token?: string; locale: 'ar' | 'fr' }): Promise<{ error?: string }> {
  const d = z.object({ password: z.string().min(10).max(200), access_token: z.string().max(4000).optional(), refresh_token: z.string().max(400).optional(), locale: z.enum(['ar', 'fr']) }).safeParse(input);
  if (!d.success) return { error: 'newPasswordHelp' };
  const db = await sessionClient();
  if (d.data.access_token && d.data.refresh_token) {
    const { error } = await db.auth.setSession({ access_token: d.data.access_token, refresh_token: d.data.refresh_token });
    if (error) return { error: 'badLogin' };
  }
  const { error } = await db.auth.updateUser({ password: d.data.password });
  if (error) return { error: 'badLogin' };
  redirect(`/${d.data.locale}/admin`);
}
