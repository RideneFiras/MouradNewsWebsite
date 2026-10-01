'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { mediaUrl } from '@/lib/env';
import type { PMNode } from '@/lib/content/render';
import { firstParagraph } from '@/lib/content/render';
import type { AdminMedia } from '@/lib/admin/media';
import { updateMedia } from '@/lib/admin/media';
import { copyArticle, createTag, deleteDraft, getRevision, listRevisions, saveArticle, type Intent, type SaveResult } from '@/lib/admin/articles';
import { FacebookIcon, WhatsappIcon } from '@/components/shared/icons';
import { Dialog } from '../Dialog';
import { FocalPicker } from '../FocalPicker';
import { MediaPicker } from '../MediaPicker';
import type { EditorArticle, EditorOptions } from './types';

// Tiptap ships to the browser only, never into the Worker bundle (docs/03 "Bundle size").
const RichText = dynamic(() => import('./RichText'), { ssr: false, loading: () => <div className="a-panel min-h-[360px]" /> });

type Role = 'admin' | 'editor' | 'author';

function Field({ id, label, help, error, children }: { id: string; label: string; help?: string; error?: string | null; children: ReactNode }) {
  return (
    <div>
      <label className="a-label" htmlFor={id}>{label}</label>
      {children}
      {help && <p className="a-help" id={`${id}-help`}>{help}</p>}
      {error && <p className="a-error" role="alert">{error}</p>}
    </div>
  );
}

const fmtTime = (iso: string) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Tunis', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

export function ArticleEditor({ initial, options, role, userId, locale }: { initial: EditorArticle; options: EditorOptions; role: Role; userId: string; locale: 'ar' | 'fr' }) {
  const t = useTranslations('admin.editor');
  const tc = useTranslations('admin.common');
  const ts = useTranslations('admin.status');
  const tt = useTranslations('admin.tags');
  const router = useRouter();
  const editorRole = role === 'editor' || role === 'admin';
  const [a, setA] = useState<EditorArticle>(initial);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(initial.updated_at);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [picker, setPicker] = useState(false);
  const [dialog, setDialog] = useState<null | 'schedule' | 'sendBack' | 'history' | 'success'>(null);
  const [success, setSuccess] = useState<{ kind: 'published' | 'scheduled' | 'submitted'; result: SaveResult } | null>(null);
  const [backup, setBackup] = useState<{ data: EditorArticle; at: string } | null>(null);
  const [revisions, setRevisions] = useState<{ id: string; title: string; created_at: string; profiles: { display_name_ar: string } | null }[] | null>(null);
  const [tagQuery, setTagQuery] = useState('');
  const [tagKind, setTagKind] = useState('topic');
  const [tags, setTags] = useState(options.tags);
  const latest = useRef(a);
  useEffect(() => {
    latest.current = a;
  }, [a]);

  const readOnly = !editorRole && (a.status !== 'draft' && a.status !== 'in_review' ? true : a.created_by !== null && a.created_by !== userId && !a.author_ids.includes(userId));
  const backupKey = `elborj:article:${a.id ?? 'new'}`;

  const set = useCallback(<K extends keyof EditorArticle>(k: K, v: EditorArticle[K]) => {
    setA((x) => ({ ...x, [k]: v }));
    setDirty(true);
  }, []);

  // Local backup in case the network drops; offer to restore on reopen.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(backupKey);
      if (!raw) return;
      const b = JSON.parse(raw) as { data: EditorArticle; at: string };
      if (!initial.updated_at || Date.parse(b.at) > Date.parse(initial.updated_at) + 2000) {
        Promise.resolve().then(() => setBackup(b));
      } else localStorage.removeItem(backupKey);
    } catch {
      /* storage unavailable */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!dirty || readOnly) return;
    const h = setTimeout(() => {
      try {
        localStorage.setItem(backupKey, JSON.stringify({ data: a, at: new Date().toISOString() }));
      } catch {
        /* ignore */
      }
    }, 800);
    return () => clearTimeout(h);
  }, [a, dirty, readOnly, backupKey]);

  const toInput = (x: EditorArticle) => ({
    id: x.id, language: x.language, kicker_override: x.kicker_override, title: x.title, subtitle: x.subtitle, body_json: x.body_json,
    location: x.location, category_id: x.category_id || null, extra_category_ids: x.extra_category_ids, format_id: x.format_id || null,
    tag_ids: x.tag_ids, author_ids: x.author_ids, byline_override: x.byline_override, cover_media_id: x.cover_media_id,
    cover_caption: x.cover_caption, cover_credit: x.cover_credit, cover_alt: x.cover_alt, excerpt: x.excerpt,
    is_featured: x.is_featured, is_breaking: x.is_breaking, breaking_hours: x.breaking_hours, is_sponsored: x.is_sponsored,
    sponsor_name: x.sponsor_name, allow_ads: x.allow_ads, seo_title: x.seo_title, seo_description: x.seo_description,
    correction_note_ar: x.correction_note_ar, correction_note_fr: x.correction_note_fr, significant_update: x.significant_update,
    translation_group_id: x.translation_group_id,
  });

  const save = useCallback(async (intent: Intent, extra: { scheduledFor?: string; reviewNote?: string } = {}) => {
    const cur = latest.current;
    if (intent === 'autosave' && (!cur.title.trim() || !cur.category_id)) return null;
    setSaving(true);
    setGeneral(null);
    const res = await saveArticle(toInput(cur), intent, extra);
    setSaving(false);
    if (!res.ok) {
      if (res.field) setErrors({ [res.field]: t(res.error as 'err_title') });
      else setGeneral(res.error === 'not_allowed' ? tc('notAllowed') : tc('error'));
      return null;
    }
    const r = res.data!;
    setErrors({});
    setDirty(false);
    setSavedAt(r.savedAt);
    setA((x) => ({ ...x, id: r.id, public_id: r.public_id, status: r.status as EditorArticle['status'], slug: r.slug, significant_update: false }));
    try {
      localStorage.removeItem(backupKey);
      if (!cur.id) localStorage.removeItem('elborj:article:new');
    } catch {
      /* ignore */
    }
    if (!cur.id) window.history.replaceState(null, '', `/${locale}/admin/articles/${r.id}`);
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backupKey, locale]);

  // Autosave every 15 s and when the tab loses focus.
  useEffect(() => {
    if (readOnly) return;
    const i = setInterval(() => { if (dirty && !saving) void save('autosave'); }, 15000);
    const onHide = () => { if (document.visibilityState === 'hidden' && dirty) void save('autosave'); };
    document.addEventListener('visibilitychange', onHide);
    return () => { clearInterval(i); document.removeEventListener('visibilitychange', onHide); };
  }, [dirty, saving, readOnly, save]);

  const act = async (intent: Intent, extra?: { scheduledFor?: string; reviewNote?: string }) => {
    const r = await save(intent, extra);
    if (!r) return;
    setDialog(null);
    if (intent === 'publish') { setSuccess({ kind: 'published', result: r }); setDialog('success'); }
    else if (intent === 'schedule') { setSuccess({ kind: 'scheduled', result: r }); setDialog('success'); }
    else if (intent === 'submit') { setSuccess({ kind: 'submitted', result: r }); setDialog('success'); }
    else if (intent === 'send_back' || intent === 'archive' || intent === 'unpublish') router.refresh();
  };

  const preview = async () => {
    const r = await save('save');
    if (r) window.open(r.previewUrl, '_blank', 'noopener');
  };

  const catName = (c: { name_ar: string; name_fr: string | null }) => (locale === 'fr' ? c.name_fr || c.name_ar : c.name_ar);
  const tops = options.categories.filter((c) => !c.parent_id && c.is_active);
  const catOptions = tops.flatMap((c) => [c, ...options.categories.filter((s) => s.parent_id === c.id && s.is_active)]);
  const tagMatches = useMemo(() => {
    const q = tagQuery.trim().toLowerCase();
    if (!q) return [];
    return tags.filter((x) => !a.tag_ids.includes(x.id) && (x.name_ar.includes(q) || (x.name_fr ?? '').toLowerCase().includes(q) || x.slug.includes(q))).slice(0, 8);
  }, [tagQuery, tags, a.tag_ids]);
  const excerptAuto = a.excerpt || firstParagraph(a.body_json, 220);
  const coverAlt = a.cover_alt || (a.cover ? (a.language === 'fr' ? a.cover.alt_fr : a.cover.alt_ar) ?? '' : '');
  const publicUrl = a.public_id ? `${options.siteUrl}/${a.language}/article/${a.public_id}${a.slug ? `/${encodeURIComponent(a.slug)}` : ''}` : '';

  const settingsPanel = (
    <div className="space-y-5">
      <Field id="category" label={t('section')} error={errors.category_id}>
        <select id="category" className="a-select" value={a.category_id} disabled={readOnly} onChange={(e) => set('category_id', e.target.value)}>
          <option value="">—</option>
          {catOptions.map((c) => <option key={c.id} value={c.id}>{c.parent_id ? '— ' : ''}{catName(c)}</option>)}
        </select>
      </Field>
      <fieldset>
        <legend className="a-label">{t('extraSections')}</legend>
        <div className="flex max-h-40 flex-wrap gap-x-3 gap-y-1 overflow-y-auto text-[14px]">
          {catOptions.filter((c) => c.id !== a.category_id).map((c) => (
            <label key={c.id} className="flex items-center gap-1">
              <input type="checkbox" disabled={readOnly} checked={a.extra_category_ids.includes(c.id)}
                onChange={(e) => set('extra_category_ids', e.target.checked ? [...a.extra_category_ids, c.id] : a.extra_category_ids.filter((x) => x !== c.id))} />
              {catName(c)}
            </label>
          ))}
        </div>
      </fieldset>
      <Field id="format" label={t('format')}>
        <select id="format" className="a-select" value={a.format_id} disabled={readOnly} onChange={(e) => set('format_id', e.target.value)}>
          <option value="">—</option>
          {options.formats.map((f) => <option key={f.id} value={f.id}>{catName(f)}</option>)}
        </select>
      </Field>
      <Field id="tags" label={t('tags')} help={t('tagsHelp')}>
        <div className="mb-2 flex flex-wrap gap-1">
          {a.tag_ids.map((id) => {
            const tag = tags.find((x) => x.id === id);
            return (
              <button key={id} type="button" className="a-chip text-ink-2" disabled={readOnly} onClick={() => set('tag_ids', a.tag_ids.filter((x) => x !== id))}>
                {tag ? catName(tag) : id.slice(0, 6)} ×
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <input id="tags" className="a-input" value={tagQuery} disabled={readOnly} onChange={(e) => setTagQuery(e.target.value)} autoComplete="off" />
          <select className="a-select w-32" value={tagKind} onChange={(e) => setTagKind(e.target.value)} aria-label={tt('kind')} disabled={readOnly}>
            {['topic', 'place', 'person', 'club', 'competition', 'event'].map((k) => <option key={k} value={k}>{tt(`kind_${k}` as 'kind_topic')}</option>)}
          </select>
        </div>
        {tagQuery.trim() && (
          <ul className="mt-1 rounded border border-rule bg-white text-[14px]">
            {tagMatches.map((x) => (
              <li key={x.id}><button type="button" className="w-full px-2 py-1.5 text-start hover:bg-paper" onClick={() => { set('tag_ids', [...a.tag_ids, x.id]); setTagQuery(''); }}>{catName(x)} <span className="text-ink-3">· {tt(`kind_${x.kind}` as 'kind_topic')}</span></button></li>
            ))}
            <li><button type="button" className="w-full px-2 py-1.5 text-start text-accent hover:bg-paper" onClick={async () => {
              const r = await createTag(tagQuery.trim(), tagKind);
              if (r.ok) { setTags((x) => [...x, r.data!]); set('tag_ids', [...a.tag_ids, r.data!.id]); setTagQuery(''); }
            }}>{t('newTag', { name: tagQuery.trim() })}</button></li>
          </ul>
        )}
      </Field>
      <Field id="authors" label={t('authors')} error={errors.author_ids}>
        <div className="flex max-h-40 flex-col gap-1 overflow-y-auto text-[14px]">
          {options.people.map((p) => (
            <label key={p.id} className="flex items-center gap-2">
              <input type="checkbox" disabled={readOnly} checked={a.author_ids.includes(p.id)}
                onChange={(e) => set('author_ids', e.target.checked ? [...a.author_ids, p.id] : a.author_ids.filter((x) => x !== p.id))} />
              {p.name}
            </label>
          ))}
        </div>
      </Field>
      <Field id="byline" label={t('bylineOverride')} help={t('bylineHelp')}>
        <input id="byline" className="a-input" value={a.byline_override} disabled={readOnly} onChange={(e) => set('byline_override', e.target.value)} />
      </Field>

      <fieldset className="space-y-3 border-t border-rule pt-4">
        <legend className="a-label">{t('cover')}</legend>
        {a.cover ? (
          <>
            <FocalPicker path={a.cover.storage_path} variants={a.cover.variants} x={a.cover.focal_x} y={a.cover.focal_y} label={t('focal')}
              onChange={async (x, y) => {
                setA((cur) => (cur.cover ? { ...cur, cover: { ...cur.cover, focal_x: x, focal_y: y } } : cur));
                if (a.cover_media_id) await updateMedia(a.cover_media_id, { focal_x: x, focal_y: y });
              }} />
            <Field id="cover_alt" label={t('alt')} help={t('altHelp')} error={errors.cover_alt}>
              <input id="cover_alt" className="a-input" value={coverAlt} disabled={readOnly} aria-invalid={!!errors.cover_alt} onChange={(e) => set('cover_alt', e.target.value)} />
            </Field>
            <Field id="cover_caption" label={t('caption')}>
              <input id="cover_caption" className="a-input" disabled={readOnly} value={a.cover_caption || ((a.language === 'fr' ? a.cover.caption_fr : a.cover.caption_ar) ?? '')} onChange={(e) => set('cover_caption', e.target.value)} />
            </Field>
            <Field id="cover_credit" label={t('credit')}>
              <input id="cover_credit" className="a-input" disabled={readOnly} value={a.cover_credit || (a.cover.credit ?? '')} onChange={(e) => set('cover_credit', e.target.value)} />
            </Field>
            {!readOnly && (
              <div className="flex gap-2">
                <button type="button" className="a-btn a-btn-sm" onClick={() => setPicker(true)}>{t('chooseImage')}</button>
                <button type="button" className="a-btn a-btn-sm a-btn-danger" onClick={() => { set('cover_media_id', null); set('cover', null); }}>{t('removeImage')}</button>
              </div>
            )}
          </>
        ) : (
          !readOnly && <button type="button" className="a-btn" onClick={() => setPicker(true)}>{t('chooseImage')}</button>
        )}
      </fieldset>

      <Field id="excerpt" label={t('excerpt')} help={`${t('excerptHelp')} · ${t('chars', { count: (a.excerpt || '').length })}`}>
        <textarea id="excerpt" className="a-textarea" rows={3} disabled={readOnly} value={a.excerpt} placeholder={excerptAuto} onChange={(e) => set('excerpt', e.target.value)} />
      </Field>

      {editorRole && (
        <fieldset className="space-y-2 border-t border-rule pt-4">
          <legend className="a-label">{t('flags')}</legend>
          <label className="flex items-center gap-2"><input type="checkbox" checked={a.is_featured} onChange={(e) => set('is_featured', e.target.checked)} />{t('featured')}</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={a.is_breaking} onChange={(e) => set('is_breaking', e.target.checked)} />{t('breaking')}</label>
          {a.is_breaking && (
            <Field id="breaking_hours" label={t('breakingHours')}>
              <input id="breaking_hours" type="number" min={1} max={72} className="a-input w-28" value={a.breaking_hours} onChange={(e) => set('breaking_hours', Number(e.target.value) || 6)} />
            </Field>
          )}
          <label className="flex items-center gap-2"><input type="checkbox" checked={a.is_sponsored} onChange={(e) => { set('is_sponsored', e.target.checked); if (e.target.checked) set('allow_ads', false); }} />{t('sponsored')}</label>
          {a.is_sponsored && (
            <Field id="sponsor_name" label={t('sponsorName')} error={errors.sponsor_name}>
              <input id="sponsor_name" className="a-input" value={a.sponsor_name} onChange={(e) => set('sponsor_name', e.target.value)} />
            </Field>
          )}
          <label className="flex items-center gap-2"><input type="checkbox" checked={a.allow_ads} disabled={a.is_sponsored} onChange={(e) => set('allow_ads', e.target.checked)} />{t('allowAds')}</label>
          {a.status === 'published' && (
            <label className="flex items-center gap-2"><input type="checkbox" checked={a.significant_update} onChange={(e) => set('significant_update', e.target.checked)} />{t('significantUpdate')}</label>
          )}
        </fieldset>
      )}

      <details className="border-t border-rule pt-4">
        <summary className="a-label cursor-pointer">{t('seo')}</summary>
        <div className="mt-3 space-y-3">
          <Field id="seo_title" label={t('seoTitle')}><input id="seo_title" className="a-input" disabled={readOnly} value={a.seo_title} placeholder={a.title} onChange={(e) => set('seo_title', e.target.value)} /></Field>
          <Field id="seo_description" label={t('seoDescription')}><textarea id="seo_description" className="a-textarea" rows={2} disabled={readOnly} value={a.seo_description} placeholder={excerptAuto} onChange={(e) => set('seo_description', e.target.value)} /></Field>
          <div className="rounded border border-rule p-3" aria-label={t('previewCard')}>
            <p className="a-help mb-1">{t('previewCard')}</p>
            {a.cover && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrl(a.cover.variants?.['960'] ?? a.cover.storage_path) ?? ''} alt="" className="mb-2 aspect-[1.91/1] w-full object-cover" style={{ objectPosition: `${a.cover.focal_x * 100}% ${a.cover.focal_y * 100}%` }} />
            )}
            <p className="text-[12px] text-ink-3" dir="ltr">{options.siteUrl.replace(/^https?:\/\//, '')}</p>
            <p className="font-semibold text-focus" lang={a.language}>{(a.seo_title || a.title || '…').slice(0, 70)}</p>
            <p className="text-[13px] text-ink-2" lang={a.language}>{(a.seo_description || excerptAuto).slice(0, 160)}</p>
          </div>
        </div>
      </details>

      <details className="border-t border-rule pt-4">
        <summary className="a-label cursor-pointer">{t('correction')}</summary>
        <div className="mt-3 space-y-3">
          <p className="a-help">{t('correctionHelp')}</p>
          <textarea className="a-textarea" rows={2} aria-label={`${t('correction')} AR`} dir="rtl" disabled={readOnly || !editorRole} value={a.correction_note_ar} onChange={(e) => set('correction_note_ar', e.target.value)} />
          <textarea className="a-textarea" rows={2} aria-label={`${t('correction')} FR`} dir="ltr" disabled={readOnly || !editorRole} value={a.correction_note_fr} onChange={(e) => set('correction_note_fr', e.target.value)} />
        </div>
      </details>

      <div className="border-t border-rule pt-4">
        <p className="a-label">{t('translation')}</p>
        {options.translations.length ? (
          <ul className="text-[14px]">{options.translations.map((x) => <li key={x.id}><Link className="underline" href={`/${locale}/admin/articles/${x.id}`} lang={x.language}>{x.language.toUpperCase()} · {x.title}</Link> <span className="text-ink-3">({ts(x.status as 'draft')})</span></li>)}</ul>
        ) : <p className="a-help">{t('noTranslation')}</p>}
        {a.id && !options.translations.some((x) => x.language !== a.language) && (
          <button type="button" className="a-btn a-btn-sm mt-2" onClick={async () => {
            const r = await copyArticle(a.id!, 'translate');
            if (r.ok) router.push(`/${locale}/admin/articles/${r.data!.id}`);
          }}>{t('createTranslation')}</button>
        )}
      </div>
    </div>
  );

  return (
    <div className="pb-24">
      {backup && (
        <div className="a-notice mb-4" data-tone="warn" role="status">
          <p>{t('offlineBackup', { time: fmtTime(backup.at) })}</p>
          <div className="mt-2 flex gap-2">
            <button type="button" className="a-btn a-btn-sm a-btn-primary" onClick={() => { setA(backup.data); setDirty(true); setBackup(null); }}>{t('restoreBackup')}</button>
            <button type="button" className="a-btn a-btn-sm" onClick={() => { try { localStorage.removeItem(backupKey); } catch { /* ignore */ } setBackup(null); }}>{t('discardBackup')}</button>
          </div>
        </div>
      )}
      {a.review_note && a.status === 'draft' && (
        <div className="a-notice mb-4" data-tone="warn"><strong>{t('reviewNoteFromEditor')}:</strong> {a.review_note}</div>
      )}
      {readOnly && <div className="a-notice mb-4">{t('notYours')}</div>}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="a-chip" data-status={a.status}>{ts(a.status)}</span>
          <span className="text-[13px] text-ink-3" aria-live="polite">
            {saving ? tc('saving') : dirty ? t('unsaved') : savedAt ? t('lastSaved', { time: fmtTime(savedAt) }) : ''}
          </span>
        </div>
        <div className="flex gap-2">
          {a.id && <button type="button" className="a-btn a-btn-sm" onClick={async () => { setDialog('history'); const r = await listRevisions(a.id!); if (r.ok) setRevisions(r.data!); }}>{t('history')}</button>}
          <button type="button" className="a-btn a-btn-sm lg:hidden" onClick={() => setShowSettings(true)}>{t('settings')}</button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-4" role="radiogroup" aria-label={t('language')}>
            <span className="a-label mb-0">{t('language')}</span>
            {(['ar', 'fr'] as const).map((l) => (
              <label key={l} className="flex items-center gap-1.5">
                <input type="radio" name="language" checked={a.language === l} disabled={readOnly} onChange={() => set('language', l)} />
                {l === 'ar' ? tc('arabic') : tc('french')}
              </label>
            ))}
          </div>
          <div dir={a.language === 'fr' ? 'ltr' : 'rtl'} lang={a.language} className="space-y-4">
            <Field id="kicker" label={t('kicker')} help={t('kickerHelp')}>
              <input id="kicker" className="a-input max-w-xs" value={a.kicker_override} disabled={readOnly} onChange={(e) => set('kicker_override', e.target.value)} />
            </Field>
            <Field id="title" label={t('title')} error={errors.title}>
              <textarea id="title" rows={2} className="a-textarea font-headline min-h-0 text-[28px] leading-snug font-bold" value={a.title} disabled={readOnly}
                aria-invalid={!!errors.title} placeholder={t('titlePlaceholder')} onChange={(e) => set('title', e.target.value.replace(/\n/g, ' '))} />
            </Field>
            <Field id="subtitle" label={t('subtitle')}>
              <textarea id="subtitle" rows={2} className="a-textarea min-h-0 font-body text-[18px]" value={a.subtitle} disabled={readOnly} onChange={(e) => set('subtitle', e.target.value)} />
            </Field>
            <div>
              <p className="a-label">{t('body')}</p>
              <RichText value={a.body_json} language={a.language} placeholder={t('bodyPlaceholder')} editable={!readOnly}
                onChange={(doc) => set('body_json', doc)} onBlur={() => { if (dirty) void save('autosave'); }} />
            </div>
            <Field id="location" label={t('location')} help={t('locationHelp')}>
              <input id="location" className="a-input max-w-xs" list="places" value={a.location} disabled={readOnly} onChange={(e) => set('location', e.target.value)} />
              <datalist id="places">{options.places.map((p) => <option key={p} value={p} />)}</datalist>
            </Field>
          </div>
        </div>
        <aside className="hidden lg:block">
          <div className="a-panel sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto p-4">
            <h2 className="a-h2 mb-4">{t('settings')}</h2>
            {settingsPanel}
          </div>
        </aside>
      </div>

      {showSettings && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-white p-4 lg:hidden" role="dialog" aria-modal="true" aria-label={t('settings')}>
          <div className="mb-4 flex items-center justify-between"><h2 className="a-h2">{t('settings')}</h2><button type="button" className="a-btn a-btn-sm" onClick={() => setShowSettings(false)}>{tc('close')}</button></div>
          {settingsPanel}
        </div>
      )}

      {/* Sticky action bar */}
      {!readOnly && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-white px-4 py-2 lg:start-60">
          {general && <p role="alert" className="a-error mb-1">{general}</p>}
          {Object.keys(errors).length > 0 && <p role="alert" className="a-error mb-1">{Object.values(errors).join(' ')}</p>}
          <div className="flex flex-wrap gap-2">
            {!editorRole ? (
              <>
                <button type="button" className="a-btn" disabled={saving} onClick={() => act('save')}>{t('saveDraft')}</button>
                {a.status === 'draft' && <button type="button" className="a-btn a-btn-primary" disabled={saving} onClick={() => act('submit')}>{t('submit')}</button>}
                <button type="button" className="a-btn" disabled={saving} onClick={preview}>{t('preview')}</button>
              </>
            ) : (
              <>
                <button type="button" className="a-btn" disabled={saving} onClick={() => act('save')}>{t('save')}</button>
                <button type="button" className="a-btn" disabled={saving} onClick={preview}>{t('preview')}</button>
                <button type="button" className="a-btn a-btn-primary" disabled={saving} onClick={() => act('publish')}>{t('publishNow')}</button>
                {a.status !== 'published' && <button type="button" className="a-btn" disabled={saving} onClick={() => setDialog('schedule')}>{t('schedule')}</button>}
                {a.status === 'in_review' && <button type="button" className="a-btn" disabled={saving} onClick={() => setDialog('sendBack')}>{t('sendBack')}</button>}
                {a.status === 'published' && <button type="button" className="a-btn" disabled={saving} onClick={() => act('unpublish')}>{t('unpublish')}</button>}
                {a.id && a.status !== 'archived' && <button type="button" className="a-btn" disabled={saving} onClick={() => act('archive')}>{t('archive')}</button>}
                {a.id && a.status === 'draft' && (
                  <button type="button" className="a-btn a-btn-danger" onClick={async () => { if (confirm(t('deleteDraft') + '?')) { const r = await deleteDraft(a.id!); if (r.ok) router.push(`/${locale}/admin/articles`); } }}>{t('deleteDraft')}</button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <MediaPicker open={picker} onClose={() => setPicker(false)} title={t('cover')} onPick={(m: AdminMedia) => {
        setA((x) => ({ ...x, cover_media_id: m.id, cover: { storage_path: m.storage_path, variants: m.variants, focal_x: Number(m.focal_x), focal_y: Number(m.focal_y), alt_ar: m.alt_ar, alt_fr: m.alt_fr, caption_ar: m.caption_ar, caption_fr: m.caption_fr, credit: m.credit } }));
        setDirty(true);
        setPicker(false);
      }} />

      <Dialog open={dialog === 'schedule'} onClose={() => setDialog(null)} title={t('schedule')}>
        <form onSubmit={(e) => {
          e.preventDefault();
          const v = String(new FormData(e.currentTarget).get('at') ?? '');
          if (v) void act('schedule', { scheduledFor: `${v}:00+01:00` }); // Africa/Tunis is UTC+1 all year
        }} className="space-y-3">
          <Field id="at" label={t('scheduleAt')} error={errors.scheduled_for}><input id="at" name="at" type="datetime-local" required className="a-input" dir="ltr" /></Field>
          <button type="submit" className="a-btn a-btn-primary">{t('confirmSchedule')}</button>
        </form>
      </Dialog>

      <Dialog open={dialog === 'sendBack'} onClose={() => setDialog(null)} title={t('sendBack')}>
        <form onSubmit={(e) => { e.preventDefault(); void act('send_back', { reviewNote: String(new FormData(e.currentTarget).get('note') ?? '') }); }} className="space-y-3">
          <Field id="note" label={t('reviewNote')} error={errors.review_note}><textarea id="note" name="note" required className="a-textarea" /></Field>
          <button type="submit" className="a-btn a-btn-primary">{t('sendBack')}</button>
        </form>
      </Dialog>

      <Dialog open={dialog === 'history'} onClose={() => setDialog(null)} title={t('history')}>
        {!revisions ? <p>{tc('loading')}</p> : revisions.length === 0 ? <p>{t('noHistory')}</p> : (
          <ul className="divide-y divide-rule">
            {revisions.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-[14px]">
                <span><span dir="ltr">{new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Tunis', dateStyle: 'short', timeStyle: 'short' }).format(new Date(r.created_at))}</span> · {r.profiles?.display_name_ar ?? ''}<br /><span className="text-ink-3">{r.title}</span></span>
                <button type="button" className="a-btn a-btn-sm" disabled={readOnly} onClick={async () => {
                  const rev = await getRevision(r.id);
                  if (!rev.ok) return;
                  setA((x) => ({ ...x, title: rev.data!.title, subtitle: rev.data!.subtitle ?? '', body_json: rev.data!.body_json as PMNode }));
                  setDirty(true);
                  setDialog(null);
                  setTimeout(() => void save('save'), 50);
                }}>{t('restore')}</button>
              </li>
            ))}
          </ul>
        )}
      </Dialog>

      <Dialog open={dialog === 'success'} onClose={() => { setDialog(null); router.refresh(); }} title={success?.kind === 'published' ? t('publishedTitle') : success?.kind === 'scheduled' ? t('scheduledTitle') : t('submittedTitle')}>
        {success?.kind === 'published' && (
          <div className="space-y-3">
            <p>{t('publishedText')}</p>
            <p dir="ltr" className="break-all rounded border border-rule bg-paper p-2 text-[13px]">{publicUrl}</p>
            <div className="flex flex-wrap gap-2">
              <a className="a-btn a-btn-primary" href={`https://wa.me/?text=${encodeURIComponent(`${a.title} ${publicUrl}?utm_source=whatsapp&utm_medium=share`)}`} target="_blank" rel="noopener"><WhatsappIcon size={18} />WhatsApp</a>
              <a className="a-btn" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${publicUrl}?utm_source=facebook&utm_medium=share`)}`} target="_blank" rel="noopener"><FacebookIcon size={18} />Facebook</a>
              <button type="button" className="a-btn" onClick={() => navigator.clipboard?.writeText(publicUrl)}>{t('copyLink')}</button>
              <a className="a-btn" href={success.result.url} target="_blank" rel="noopener">{t('openArticle')}</a>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
