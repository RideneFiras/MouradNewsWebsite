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
