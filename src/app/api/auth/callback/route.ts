import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { sessionClient } from '@/lib/supabase/server';

/** Supabase e-mail links (password reset, invite with PKCE/OTP) land here, then go to `next`. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get('next') ?? '/ar/admin';
  const safeNext = /^\/(ar|fr)\/admin(\/[a-z/-]*)?$/.test(next) ? next : '/ar/admin';
  const db = await sessionClient();
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  let ok = false;
  if (code) ok = !(await db.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash && type) ok = !(await db.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  const locale = safeNext.split('/')[1];
  return NextResponse.redirect(new URL(ok ? safeNext : `/${locale}/admin/login`, url.origin));
}
