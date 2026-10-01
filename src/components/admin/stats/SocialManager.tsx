'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { saveSocialStats } from '@/lib/admin/social';
import { formatInt } from '@/lib/format/number';

export interface SocialEntry {
  id: string; platform: 'facebook' | 'instagram' | 'youtube' | 'tiktok'; recorded_for: string; followers: number | null; reach_28d: number | null;
  engagement_28d: number | null; note: string | null; entered_by: string | null; created_at: string; entered_by_name?: string | null;
}

const PLATFORMS = ['facebook', 'instagram', 'youtube', 'tiktok'] as const;
const n = (v: FormDataEntryValue | null) => {
  const s = String(v ?? '').replace(/[\s ]/g, '');
  return s === '' ? null : Math.max(0, Math.round(Number(s)));
};

export function SocialManager({ initial, me, today, nowMs }: { initial: SocialEntry[]; me: string; today: string; nowMs: number }) {
  const t = useTranslations('admin.stats.social');
  const tc = useTranslations('admin.common');
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<SocialEntry | null>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'danger'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const canFix = (r: SocialEntry) => r.entered_by === me && nowMs - Date.parse(r.created_at) < 24 * 3600_000;
  const fmt = (v: number | null) => (v == null ? '—' : formatInt(v));

  return (
    <div className="space-y-6">
      <form key={editing?.id ?? 'new'} className="a-panel grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3" onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const form = e.currentTarget;
        setBusy(true);
        const res = await saveSocialStats({
          id: editing?.id, platform: String(f.get('platform')) as SocialEntry['platform'], recorded_for: String(f.get('recorded_for')),
          followers: n(f.get('followers')), reach_28d: n(f.get('reach_28d')), engagement_28d: n(f.get('engagement_28d')), note: String(f.get('note') ?? ''),
        });
        setBusy(false);
        if (!res.ok) return setMsg({ tone: 'danger', text: res.field === 'followers' ? t('needOne') : tc('error') });
        const saved = { ...(res.data as SocialEntry), entered_by_name: editing?.entered_by_name ?? null };
        setRows((all) => (editing ? all.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...all]));
        setEditing(null);
        form.reset();
        setMsg({ tone: 'ok', text: t('added') });
      }}>
        <p className="a-help sm:col-span-2 lg:col-span-3">{t('help')}</p>
        <div>
          <label className="a-label" htmlFor="s-platform">{t('platform')}</label>
          <select id="s-platform" name="platform" className="a-select" defaultValue={editing?.platform ?? 'facebook'}>
            {PLATFORMS.map((p) => <option key={p} value={p}>{t(`platforms.${p}`)}</option>)}
          </select>
        </div>
        <div>
          <label className="a-label" htmlFor="s-date">{t('recordedFor')}</label>
          <input id="s-date" name="recorded_for" type="date" required max={today} defaultValue={editing?.recorded_for ?? today} className="a-input" dir="ltr" />
        </div>
        <div>
          <label className="a-label" htmlFor="s-followers">{t('followers')}</label>
          <input id="s-followers" name="followers" inputMode="numeric" pattern="[0-9 ]*" defaultValue={editing?.followers ?? ''} className="a-input" dir="ltr" />
        </div>
        <div>
          <label className="a-label" htmlFor="s-reach">{t('reach')}</label>
          <input id="s-reach" name="reach_28d" inputMode="numeric" pattern="[0-9 ]*" defaultValue={editing?.reach_28d ?? ''} className="a-input" dir="ltr" />
        </div>
        <div>
          <label className="a-label" htmlFor="s-eng">{t('engagement')}</label>
          <input id="s-eng" name="engagement_28d" inputMode="numeric" pattern="[0-9 ]*" defaultValue={editing?.engagement_28d ?? ''} className="a-input" dir="ltr" />
        </div>
        <div>
          <label className="a-label" htmlFor="s-note">{t('note')}</label>
          <input id="s-note" name="note" maxLength={300} defaultValue={editing?.note ?? ''} className="a-input" dir="auto" />
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-3">
          <button type="submit" className="a-btn a-btn-primary" disabled={busy}>{editing ? tc('save') : t('add')}</button>
          {editing && <button type="button" className="a-btn" onClick={() => setEditing(null)}>{tc('cancel')}</button>}
          {msg && <p role={msg.tone === 'danger' ? 'alert' : 'status'} className={msg.tone === 'danger' ? 'a-error' : 'text-[14px] text-ok'}>{msg.text}</p>}
        </div>
      </form>

      <section className="a-panel p-4">
        <h2 className="a-h2 mb-1">{t('manual')}</h2>
        {rows.length === 0 ? <p className="text-[14px] text-ink-3">{t('empty')}</p> : (
          <div className="overflow-x-auto">
            <table className="a-table">
              <thead><tr><th>{t('recordedFor')}</th><th>{t('platform')}</th><th>{t('followers')}</th><th>{t('reach')}</th><th>{t('engagement')}</th><th>{t('note')}</th><th>{t('enteredBy')}</th><th /></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap" dir="ltr">{r.recorded_for}</td>
                    <td>{t(`platforms.${r.platform}`)}</td>
                    <td className="tabular-nums">{fmt(r.followers)}</td>
                    <td className="tabular-nums">{fmt(r.reach_28d)}</td>
                    <td className="tabular-nums">{fmt(r.engagement_28d)}</td>
                    <td dir="auto">{r.note}</td>
                    <td>{r.entered_by_name ?? '—'}</td>
                    <td>{canFix(r) && <button type="button" className="a-btn a-btn-sm" onClick={() => { setMsg(null); setEditing(r); }}>{t('fix')}</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
