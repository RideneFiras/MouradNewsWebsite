'use client';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { addHolidays, deleteEvent, saveEvent, searchArticlesForEvent } from '@/lib/admin/events';
import { Dialog } from './Dialog';

export interface EventRow {
  id: string;
  kind: 'event' | 'holiday';
  title_ar: string;
  title_fr: string | null;
  starts_on: string;
  ends_on: string | null;
  start_time: string | null;
  end_time: string | null;
  place: string | null;
  town_tag_id: string | null;
  article_id: string | null;
  is_estimate: boolean;
  is_visible: boolean;
  article: { public_id: number; title: string; status: string } | null;
}
export interface TownOption { id: string; name: string }

const hm = (t: string | null) => (t ? t.slice(0, 5) : '');

/** Calendar (الأجندة): list upcoming/past entries, add or edit one, add a year's public holidays. */
export function EventsManager({ initial, towns, today }: { initial: EventRow[]; towns: TownOption[]; today: string }) {
  const t = useTranslations('admin.agenda');
  const tc = useTranslations('admin.common');
  const [rows, setRows] = useState(initial);
  const [past, setPast] = useState(false);
  const [editing, setEditing] = useState<Partial<EventRow> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [found, setFound] = useState<{ id: string; public_id: number; title: string; status: string }[]>([]);
  const year = Number(today.slice(0, 4));
  const shown = useMemo(
    () => rows.filter((r) => (past ? (r.ends_on ?? r.starts_on) < today : (r.ends_on ?? r.starts_on) >= today))
      .sort((a, b) => (past ? b.starts_on.localeCompare(a.starts_on) : a.starts_on.localeCompare(b.starts_on))),
    [rows, past, today],
  );
  const townName = (id: string | null) => towns.find((x) => x.id === id)?.name ?? '';

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button type="button" className="a-btn a-btn-primary" onClick={() => { setError(null); setFound([]); setQ(''); setEditing({ kind: 'event', is_visible: true, is_estimate: false, starts_on: today }); }}>{t('new')}</button>
        {[year, year + 1].map((y) => (
          <button key={y} type="button" className="a-btn" onClick={async () => {
            setStatus(tc('saving'));
            const r = await addHolidays(y);
            const added = r.ok ? r.data?.added ?? 0 : 0;
            setStatus(r.ok ? t('holidaysAdded', { n: added, year: y }) : tc('error'));
            if (added) location.reload();
          }}>{t('addHolidays', { year: y })}</button>
        ))}
        <label className="ms-auto flex items-center gap-2"><input type="checkbox" checked={past} onChange={(e) => setPast(e.target.checked)} />{t('showPast')}</label>
      </div>
      {status && <p className="a-help mb-3" role="status">{status}</p>}
      <p className="a-help mb-3">{t('help')}</p>

      <div className="a-panel overflow-x-auto">
        <table className="a-table">
          <thead><tr><th>{t('date')}</th><th>{t('titleAr')}</th><th>{t('place')}</th><th>{t('article')}</th><th>{tc('actions')}</th></tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className={r.is_visible ? '' : 'opacity-50'}>
                <td className="whitespace-nowrap tabular-nums" dir="ltr">
                  {r.starts_on}{r.ends_on && r.ends_on !== r.starts_on ? ` → ${r.ends_on}` : ''}{r.start_time ? ` · ${hm(r.start_time)}` : ''}
                </td>
                <td>
                  <span className="font-semibold">{r.title_ar}</span>
                  {r.kind === 'holiday' && <span className="a-help ms-2">{t('kind_holiday')}</span>}
                  {r.is_estimate && <span className="a-help ms-2 text-warn">{t('estimate')}</span>}
                </td>
                <td>{[r.place, townName(r.town_tag_id)].filter(Boolean).join(' · ')}</td>
                <td>{r.article ? <span>#{r.article.public_id} {r.article.status !== 'published' && <span className="a-help">({r.article.status})</span>}</span> : ''}</td>
                <td className="whitespace-nowrap">
                  <div className="flex gap-1">
                    <button type="button" className="a-btn a-btn-sm" onClick={() => { setError(null); setFound(r.article && r.article_id ? [{ id: r.article_id, ...r.article }] : []); setQ(''); setEditing(r); }}>{tc('edit')}</button>
                    <button type="button" className="a-btn a-btn-sm a-btn-danger" onClick={async () => {
                      if (!confirm(`${tc('delete')}: ${r.title_ar}?`)) return;
                      const res = await deleteEvent(r.id);
                      if (res.ok) setRows((all) => all.filter((x) => x.id !== r.id));
                    }}>{tc('delete')}</button>
                  </div>
                </td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={5} className="a-help">{t('empty')}</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? tc('edit') : t('new')} wide>
        {editing && (
          <form className="space-y-3" onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const get = (k: string) => String(f.get(k) ?? '');
            const input = {
              id: editing.id, kind: get('kind') as 'event', title_ar: get('title_ar'), title_fr: get('title_fr'),
              starts_on: get('starts_on'), ends_on: get('ends_on'), start_time: get('start_time'), end_time: get('end_time'),
              place: get('place'), town_tag_id: get('town_tag_id'), article_id: get('article_id'),
              is_estimate: f.get('is_estimate') === 'on', is_visible: f.get('is_visible') === 'on',
            };
            const r = await saveEvent(input);
            if (!r.ok) return setError(r.field === 'ends_on' ? t('endsBeforeStart') : tc('error'));
            location.reload();
          }}>
            <div className="grid gap-3 md:grid-cols-2">
              <div><label className="a-label" htmlFor="e-kind">{t('kind')}</label>
                <select id="e-kind" name="kind" defaultValue={editing.kind} className="a-select">
                  <option value="event">{t('kind_event')}</option><option value="holiday">{t('kind_holiday')}</option>
                </select></div>
              <div><label className="a-label" htmlFor="e-town">{t('town')}</label>
                <select id="e-town" name="town_tag_id" defaultValue={editing.town_tag_id ?? ''} className="a-select">
                  <option value="">—</option>{towns.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select></div>
            </div>
            <div><label className="a-label" htmlFor="e-tar">{t('titleAr')}</label><input id="e-tar" name="title_ar" required maxLength={300} defaultValue={editing.title_ar ?? ''} className="a-input" /></div>
            <div><label className="a-label" htmlFor="e-tfr">{t('titleFr')}</label><input id="e-tfr" name="title_fr" lang="fr" dir="ltr" maxLength={300} defaultValue={editing.title_fr ?? ''} className="a-input" /></div>
            <div className="grid gap-3 md:grid-cols-4">
              <div><label className="a-label" htmlFor="e-s">{t('startsOn')}</label><input id="e-s" name="starts_on" type="date" required defaultValue={editing.starts_on ?? ''} className="a-input" /></div>
              <div><label className="a-label" htmlFor="e-e">{t('endsOn')}</label><input id="e-e" name="ends_on" type="date" defaultValue={editing.ends_on ?? ''} className="a-input" /></div>
              <div><label className="a-label" htmlFor="e-st">{t('startTime')}</label><input id="e-st" name="start_time" type="time" defaultValue={hm(editing.start_time ?? null)} className="a-input" /></div>
              <div><label className="a-label" htmlFor="e-et">{t('endTime')}</label><input id="e-et" name="end_time" type="time" defaultValue={hm(editing.end_time ?? null)} className="a-input" /></div>
            </div>
            <div><label className="a-label" htmlFor="e-p">{t('place')}</label><input id="e-p" name="place" maxLength={200} defaultValue={editing.place ?? ''} className="a-input" placeholder={t('placeHint')} /></div>
            <div>
              <label className="a-label" htmlFor="e-q">{t('article')}</label>
              <div className="flex gap-2">
                <input id="e-q" className="a-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('articleSearch')} />
                <button type="button" className="a-btn" onClick={async () => { const r = await searchArticlesForEvent(q); if (r.ok) setFound(r.data ?? []); }}>{tc('search')}</button>
              </div>
              <select name="article_id" defaultValue={editing.article_id ?? ''} key={found.map((x) => x.id).join()} className="a-select mt-2">
                <option value="">{t('noArticle')}</option>
                {found.map((x) => <option key={x.id} value={x.id}>#{x.public_id} {x.title}{x.status !== 'published' ? ` (${x.status})` : ''}</option>)}
              </select>
              <p className="a-help">{t('articleHelp')}</p>
            </div>
            <label className="flex items-center gap-2"><input type="checkbox" name="is_estimate" defaultChecked={editing.is_estimate} />{t('estimateLabel')}</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="is_visible" defaultChecked={editing.is_visible ?? true} />{t('visible')}</label>
            {error && <p role="alert" className="a-error">{error}</p>}
            <button type="submit" className="a-btn a-btn-primary">{tc('save')}</button>
          </form>
        )}
      </Dialog>
    </div>
  );
}
