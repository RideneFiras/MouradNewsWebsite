'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { inviteStaff, setStaffActive, setStaffRole } from '@/lib/admin/site';

export interface Member { id: string; email: string; role: 'admin' | 'editor' | 'author'; is_active: boolean; display_name_ar: string; slug: string; last_sign_in_at: string | null; article_count: number }

export function TeamManager({ members, locale, me }: { members: Member[]; locale: 'ar' | 'fr'; me: string }) {
  const t = useTranslations('admin.team');
  const tr = useTranslations('admin.roles');
  const tc = useTranslations('admin.common');
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const fail = (e: string) => setMsg(e === 'last_admin' ? t('lastAdmin') : tc('error'));
  return (
    <div className="space-y-6">
      <form className="a-panel grid gap-2 p-4 md:grid-cols-[1fr_1fr_160px_auto]" onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const r = await inviteStaff(String(f.get('email')), String(f.get('role')) as 'author', String(f.get('name')), locale);
        if (r.ok) { setMsg(t('invited')); (e.target as HTMLFormElement).reset(); router.refresh(); } else fail(r.error);
      }}>
        <h2 className="a-h2 md:col-span-4">{t('invite')}</h2>
        <input name="email" type="email" required dir="ltr" className="a-input" placeholder="email@example.com" aria-label="email" />
        <input name="name" required className="a-input" placeholder={t('displayName')} aria-label={t('displayName')} />
        <select name="role" className="a-select" defaultValue="author" aria-label={t('role')}>
          {(['author', 'editor', 'admin'] as const).map((r) => <option key={r} value={r}>{tr(r)}</option>)}
        </select>
        <button type="submit" className="a-btn a-btn-primary">{t('invite')}</button>
        <p className="a-help md:col-span-4">{t('inviteHelp')}</p>
      </form>
      {msg && <p role="status" className="a-notice">{msg}</p>}
      <div className="a-panel overflow-x-auto">
        <table className="a-table">
          <thead><tr><th>{t('displayName')}</th><th>email</th><th>{t('role')}</th><th>{t('lastSignIn')}</th><th>{t('articles')}</th><th>{tc('actions')}</th></tr></thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className={m.is_active ? '' : 'opacity-60'}>
                <td className="font-semibold">{m.display_name_ar}</td>
                <td dir="ltr">{m.email}</td>
                <td>
                  <select className="a-select w-auto" value={m.role} aria-label={t('role')} onChange={async (e) => { const r = await setStaffRole(m.id, e.target.value as 'author'); if (r.ok) router.refresh(); else fail(r.error); }}>
                    {(['author', 'editor', 'admin'] as const).map((r) => <option key={r} value={r}>{tr(r)}</option>)}
                  </select>
                </td>
                <td dir="ltr">{m.last_sign_in_at ? new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Tunis', dateStyle: 'short', timeStyle: 'short' }).format(new Date(m.last_sign_in_at)) : t('never')}</td>
                <td className="tabular-nums">{m.article_count}</td>
                <td className="whitespace-nowrap">
                  <div className="flex gap-1">
                    <Link prefetch={false} className="a-btn a-btn-sm" href={`/${locale}/admin/profile?user=${m.id}`}>{t('editProfile')}</Link>
                    {m.id !== me && (
                      <button type="button" className={`a-btn a-btn-sm ${m.is_active ? 'a-btn-danger' : ''}`} onClick={async () => { const r = await setStaffActive(m.id, !m.is_active); if (r.ok) router.refresh(); else fail(r.error); }}>
                        {m.is_active ? t('deactivate') : t('reactivate')}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
