'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { deleteMessage, setMessageStatus } from '@/lib/admin/site';

export interface Msg { id: string; name: string; email: string; subject: string; message: string; locale: string; status: 'new' | 'read' | 'handled'; created_at: string }

export function MessagesList({ initial }: { initial: Msg[] }) {
  const t = useTranslations('admin.messages');
  const tc = useTranslations('admin.common');
  const [rows, setRows] = useState(initial);
  const [subject, setSubject] = useState('');
  const [status, setStatus] = useState('');
  const set = async (m: Msg, s: Msg['status']) => { const r = await setMessageStatus(m.id, s); if (r.ok) setRows((x) => x.map((y) => (y.id === m.id ? { ...y, status: s } : y))); };
  const shown = rows.filter((m) => (!subject || m.subject === subject) && (!status || m.status === status));
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <select className="a-select w-auto" value={subject} onChange={(e) => setSubject(e.target.value)} aria-label={t('allSubjects')}>
          <option value="">{t('allSubjects')}</option>
          {['news_tip', 'advertising', 'correction', 'other'].map((s) => <option key={s} value={s}>{t(`subject_${s}` as 'subject_other')}</option>)}
        </select>
        <select className="a-select w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label={tc('filter')}>
          <option value="">{tc('all')}</option>
          {(['new', 'read', 'handled'] as const).map((s) => <option key={s} value={s}>{t(s)}</option>)}
        </select>
      </div>
      {shown.length === 0 ? <p className="text-ink-3">{tc('empty')}</p> : (
        <ul className="space-y-3">
          {shown.map((m) => (
            <li key={m.id} className={`a-panel p-4 ${m.status === 'new' ? 'border-s-[3px] border-s-accent' : ''}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p><strong>{t(`subject_${m.subject}` as 'subject_other')}</strong> · {m.name} · <a className="underline" dir="ltr" href={`mailto:${m.email}`}>{m.email}</a></p>
                <span className="text-[13px] text-ink-3" dir="ltr">{new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Tunis', dateStyle: 'short', timeStyle: 'short' }).format(new Date(m.created_at))}</span>
              </div>
              <p className="mt-2 whitespace-pre-line" dir="auto">{m.message}</p>
              <div className="mt-3 flex gap-2">
                {m.status === 'new' && <button type="button" className="a-btn a-btn-sm" onClick={() => set(m, 'read')}>{t('markRead')}</button>}
                {m.status !== 'handled' && <button type="button" className="a-btn a-btn-sm" onClick={() => set(m, 'handled')}>{t('markHandled')}</button>}
                <button type="button" className="a-btn a-btn-sm a-btn-danger" onClick={async () => { if (confirm(`${tc('delete')}?`)) { const r = await deleteMessage(m.id); if (r.ok) setRows((x) => x.filter((y) => y.id !== m.id)); } }}>{tc('delete')}</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
