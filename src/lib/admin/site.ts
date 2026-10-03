'use server';
import { z } from 'zod';
import { sessionClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { ActionError, assertStaff, check, isAdmin, one, run } from '@/lib/auth/staff';
import { expireEverything, expireTags } from '@/lib/cache/revalidate';
import { renderDoc, type PMNode } from '@/lib/content/render';
import { sanitizeArticleHtml } from '@/lib/content/sanitize';
import { mediaUrl, siteUrl } from '@/lib/env';
import { SLUG_RE, slugify } from '@/lib/slug';

const ED = ['editor', 'admin'] as const;
const txt = (max = 500) => z.string().trim().max(max).nullish().transform((v) => v || null);

// ------------------------------------------------------------- menus

const MenuInput = z.object({
  id: z.string().uuid().nullish(),
  menu: z.enum(['header_extra', 'footer', 'utility']),
  label_ar: z.string().trim().min(1).max(80),
  label_fr: txt(80),
  target_type: z.enum(['url', 'category', 'page', 'tag']),
  url: z.string().trim().max(500).nullish().transform((v) => v || null).refine((v) => v === null || /^(https:\/\/|\/)/.test(v), 'url'),
  category_id: z.string().uuid().nullish().transform((v) => v || null),
  page_id: z.string().uuid().nullish().transform((v) => v || null),
  tag_id: z.string().uuid().nullish().transform((v) => v || null),
  is_active: z.boolean().default(true),
  open_in_new_tab: z.boolean().default(false),
});

export async function saveMenuItem(raw: z.input<typeof MenuInput>) {
  return run(async () => {
    await assertStaff([...ED]);
    const d = MenuInput.parse(raw);
    const db = await sessionClient();
    const row = { ...d };
    delete (row as { id?: unknown }).id;
    const res = d.id ? one(await db.from('menu_items').update(row).eq('id', d.id).select('*').single()) : one(await db.from('menu_items').insert({ ...row, position: 999 }).select('*').single());
    expireTags(['menus']);
    return res;
  });
}

export async function deleteMenuItem(id: string) {
  return run(async () => {
    await assertStaff([...ED]);
    const db = await sessionClient();
    check(await db.from('menu_items').delete().eq('id', id));
    expireTags(['menus']);
  });
}

// ------------------------------------------------------------- static pages

const PageInput = z.object({
  id: z.string().uuid().nullish(),
  language: z.enum(['ar', 'fr']),
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().max(80).optional(),
  body_json: z.any().nullish(),
  page_kind: z.enum(['standard', 'media_kit', 'contact', 'charter', 'privacy', 'about', 'legal']),
  show_in_footer: z.boolean().default(false),
  status: z.enum(['draft', 'published']),
  seo_title: txt(200),
  seo_description: txt(400),
  translation_group_id: z.string().uuid().nullish(),
});

export async function savePage(raw: z.input<typeof PageInput>) {
  return run(async () => {
    const staff = await assertStaff([...ED]);
    const d = PageInput.parse(raw);
    const db = await sessionClient();
    const s = d.slug ? z.string().regex(SLUG_RE).parse(d.slug) : slugify(d.title) || `page-${Date.now().toString(36)}`;
    const doc = (d.body_json ?? { type: 'doc', content: [] }) as PMNode;
    const row = {
      language: d.language, title: d.title, slug: s, body_json: doc, page_kind: d.page_kind, show_in_footer: d.show_in_footer, status: d.status,
      seo_title: d.seo_title, seo_description: d.seo_description, translation_group_id: d.translation_group_id ?? null, updated_by: staff.id,
      body_html: sanitizeArticleHtml(renderDoc(doc, { mediaUrl: (p) => mediaUrl(p), locale: d.language })),
    };
    const res = d.id ? one(await db.from('pages').update(row).eq('id', d.id).select('*').single()) : one(await db.from('pages').insert({ ...row, position: 999 }).select('*').single());
    expireTags(['pages', 'menus', 'redirects']);
    return res as { id: string; slug: string };
  });
}

export async function deletePage(id: string) {
  return run(async () => {
    await assertStaff([...ED]);
    const db = await sessionClient();
    check(await db.from('pages').delete().eq('id', id));
    expireTags(['pages', 'menus']);
  });
}

// ------------------------------------------------------------- settings

const S = z.string().trim().max(300).default('');
const SETTINGS: Record<string, z.ZodType> = {
  site_name: z.object({ ar: z.string().trim().min(1).max(60), fr: z.string().trim().max(60).default('') }),
  tagline: z.object({ ar: S, fr: S }),
  logo: z.object({ media_id: z.string().uuid().nullable(), use_text_nameplate: z.boolean() }),
  favicon_media_id: z.string().uuid().nullable(),
  default_og_media_id: z.string().uuid().nullable(),
  masthead_ears: z.object({ start: z.enum(['latest', 'none']), end_ar: S, end_fr: S }),
  legal_masthead: z.object({ director_ar: S, director_fr: S, editor_in_chief_ar: S, editor_in_chief_fr: S, address_ar: S, address_fr: S, phone: S, email: S, ads_email: S, ads_phone: S }),
  social_links: z.object({ facebook: S, instagram: S, youtube: S, x: S, whatsapp_channel: S }).refine((o) => Object.values(o).every((v) => !v || /^https:\/\//.test(v)), 'https'),
  show_hijri_date: z.object({ enabled: z.boolean(), offset_days: z.coerce.number().int().min(-2).max(2) }),
  breaking: z.object({ enabled: z.boolean(), default_hours: z.coerce.number().int().min(1).max(72) }),
  content_mixing: z.object({ fr_include_arabic_content: z.boolean(), ar_include_french_content: z.boolean() }),
  public_languages: z.object({ fr: z.boolean() }),
  ga4: z.object({ measurement_id: z.string().trim().regex(/^(G-[A-Z0-9]{4,15})?$/) }),
  adsense: z.object({ client_id: z.string().trim().regex(/^(ca-pub-\d{10,20})?$/), enabled: z.boolean() }),
  ads_txt: z.object({ content: z.string().max(5000) }),
  consent: z.object({ mode: z.enum(['google_cmp', 'none']), custom_text_ar: S, custom_text_fr: S }),
  in_article_ads: z.object({ after_paragraphs: z.array(z.coerce.number().int().min(1).max(50)).max(2), min_paragraphs: z.coerce.number().int().min(1).max(50) }),
  analytics: z.object({ raw_retention_days: z.coerce.number().int().min(35).max(180), exclude_staff: z.literal(true).default(true) }),
  home_text_block: z.object({ text_ar: z.string().max(2000), text_fr: z.string().max(2000) }),
  media_kit: z.object({
    metrics: z.record(z.string(), z.boolean()),
    period: z.enum(['last_full_month', 'last_30_days', 'last_3_months_avg']),
    rounding: z.enum(['exact', 'round_down']),
    statement_ar: z.string().max(1000), statement_fr: z.string().max(1000),
    contact_name: S, contact_phone: S, contact_email: S,
    formats: z.array(z.object({ name_ar: S, name_fr: S, description_ar: S, description_fr: S, size: S, price_ar: S, price_fr: S, visible: z.boolean() })).max(20),
  }),
};
const PUBLIC_KEYS = new Set(Object.keys(SETTINGS).filter((k) => k !== 'analytics'));

export async function saveSettings(values: Record<string, unknown>) {
  return run(async () => {
    await assertStaff(['admin']);
    const db = await sessionClient();
    const rows = Object.entries(values).map(([key, value]) => {
      const schema = SETTINGS[key];
      if (!schema) throw new ActionError('unknown_setting', key);
      const parsed = schema.safeParse(value);
      if (!parsed.success) throw new ActionError('invalid', key);
      return { key, value: parsed.data, is_public: PUBLIC_KEYS.has(key) };
    });
    if (rows.length) check(await db.from('site_settings').upsert(rows));
    expireTags(['settings', 'stats', 'ads']);
  });
}

// ------------------------------------------------------------- team & profile

export async function inviteStaff(email: string, role: 'admin' | 'editor' | 'author', displayName: string, locale: 'ar' | 'fr') {
  return run(async () => {
    await assertStaff(['admin']);
    const e = z.string().trim().email().parse(email);
    const r = z.enum(['admin', 'editor', 'author']).parse(role);
    const name = z.string().trim().min(1).max(80).parse(displayName);
    const svc = adminClient();
    const { data, error } = await svc.auth.admin.inviteUserByEmail(e, { data: { display_name: name }, redirectTo: `${siteUrl()}/${locale}/admin/reset` });
    if (error || !data.user) throw new Error(error?.message ?? 'invite failed');
    // The profile row is created by the auth trigger as "author"; raise the role if needed.
    if (r !== 'author') check(await svc.from('profiles').update({ role: r }).eq('id', data.user.id));
  });
}

export async function setStaffRole(id: string, role: 'admin' | 'editor' | 'author') {
  return run(async () => {
    await assertStaff(['admin']);
    const db = await sessionClient();
    const res = await db.from('profiles').update({ role: z.enum(['admin', 'editor', 'author']).parse(role) }).eq('id', id);
    if (res.error) throw new ActionError(/last_admin/.test(res.error.message) ? 'last_admin' : 'error');
  });
}

export async function setStaffActive(id: string, active: boolean) {
  return run(async () => {
    const me = await assertStaff(['admin']);
    if (id === me.id && !active) throw new ActionError('last_admin');
    const db = await sessionClient();
    const res = await db.from('profiles').update({ is_active: active }).eq('id', id);
    if (res.error) throw new ActionError(/last_admin/.test(res.error.message) ? 'last_admin' : 'error');
    // Ban / unban the auth user so existing sessions stop working.
    await adminClient().auth.admin.updateUserById(id, { ban_duration: active ? 'none' : '876000h' });
    expireTags(['authors', 'articles']);
  });
}

const ProfileInput = z.object({
  display_name_ar: z.string().trim().min(1).max(80),
  display_name_fr: txt(80),
  slug: z.string().trim().regex(SLUG_RE).max(60),
  title_ar: txt(120), title_fr: txt(120),
  bio_ar: txt(2000), bio_fr: txt(2000),
  avatar_media_id: z.string().uuid().nullish().transform((v) => v || null),
  email_public: z.string().trim().max(200).nullish().transform((v) => v || null).refine((v) => !v || z.string().email().safeParse(v).success, 'email'),
  social: z.record(z.string(), z.string().trim().max(300)).default({}),
  show_public_page: z.boolean().default(true),
  ui_locale: z.enum(['ar', 'fr']).default('ar'),
});

export async function saveProfile(id: string, raw: z.input<typeof ProfileInput>) {
  return run(async () => {
    const me = await assertStaff();
    if (id !== me.id && !isAdmin(me)) throw new ActionError('not_allowed');
    const d = ProfileInput.parse(raw);
    d.social = Object.fromEntries(Object.entries(d.social).filter(([, v]) => /^https:\/\//.test(v)));
    const db = await sessionClient();
    const res = await db.from('profiles').update(d).eq('id', id);
    if (res.error) throw new ActionError(/duplicate|unique/.test(res.error.message) ? 'slug_taken' : 'error', /duplicate|unique/.test(res.error.message) ? 'slug' : undefined);
    expireTags(['authors', 'articles', 'redirects']);
  });
}

export async function changePassword(password: string) {
  return run(async () => {
    await assertStaff();
    const p = z.string().min(10).max(200).parse(password);
    const db = await sessionClient();
    const { error } = await db.auth.updateUser({ password: p });
    if (error) throw new Error(error.message);
  });
}

// ------------------------------------------------------------- messages & system

export async function setMessageStatus(id: string, status: 'new' | 'read' | 'handled') {
  return run(async () => {
    const me = await assertStaff([...ED]);
    const db = await sessionClient();
    check(await db.from('contact_messages').update({ status: z.enum(['new', 'read', 'handled']).parse(status), handled_by: status === 'handled' ? me.id : null }).eq('id', id));
  });
}

export async function deleteMessage(id: string) {
  return run(async () => {
    await assertStaff([...ED]);
    const db = await sessionClient();
    check(await db.from('contact_messages').delete().eq('id', id));
  });
}

export async function regenerateCache() {
  return run(async () => {
    await assertStaff(['admin']);
    expireEverything();
  });
}
