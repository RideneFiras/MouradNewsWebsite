'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { browserClient } from '@/lib/supabase/browser';

/** New password. Works after a reset link (session cookie set by /api/auth/callback) and after
 * an invite link (session tokens in the URL hash, picked up by the browser client). */
export function ResetForm({ locale }: { locale: string }) {
  const t = useTranslations('admin.auth');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const password = String(new FormData(e.currentTarget).get('password') ?? '');
        if (password.length < 10) return setError(t('newPasswordHelp'));
        setPending(true);
        const db = browserClient();
        await db.auth.getSession(); // consumes tokens from the URL hash (invites)
        const { error: err } = await db.auth.updateUser({ password });
        setPending(false);
        if (err) return setError(err.message);
        router.replace(`/${locale}/admin`);
        router.refresh();
      }}
    >
      <div>
        <label className="a-label" htmlFor="password">{t('newPassword')}</label>
        <input id="password" name="password" type="password" minLength={10} required autoComplete="new-password" dir="ltr" className="a-input" />
        <p className="a-help">{t('newPasswordHelp')}</p>
      </div>
      {error && <p role="alert" className="a-error">{error}</p>}
      <button type="submit" className="a-btn a-btn-primary w-full" disabled={pending}>{t('setPassword')}</button>
    </form>
  );
}
