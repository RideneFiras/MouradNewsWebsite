import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { Category, Lang, MenuItem, StaticPage } from '@/lib/data/types';
import type { SiteSettings } from '@/lib/data/settings';
import { pick } from '@/lib/data/settings';
import { menuUrl, pageHref, sectionHref } from '@/lib/public/links';
import { categoryName } from '@/lib/public/labels';
import { Nameplate } from './Nameplate';
import { SOCIAL_LABELS, socialLinks } from '@/lib/public/social';

export async function Footer({ locale, settings, categories, menu, pages }: {
  locale: Lang; settings: SiteSettings; categories: Category[]; menu: MenuItem[]; pages: StaticPage[];
}) {
  const t = await getTranslations({ locale, namespace: 'common' });
  const tm = await getTranslations({ locale, namespace: 'masthead' });
  const lm = settings.legal_masthead ?? {};
  const v = (k: string) => (locale === 'fr' ? lm[`${k}_fr`] || lm[`${k}_ar`] : lm[`${k}_ar`] || lm[`${k}_fr`]) || lm[k] || '';
  const top = categories.filter((c) => !c.parent_id && c.show_in_nav);
  const pagesById = new Map(pages.map((p) => [p.id, p]));
  const catById = new Map(categories.map((c) => [c.id, c]));

  // Footer links: the "footer" menu if any; otherwise published pages flagged show_in_footer.
  const links = menu.length
    ? menu.map((m) => {
        const label = (locale === 'fr' ? m.label_fr : null) || m.label_ar;
        if (m.target_type === 'url' && m.url) {
          // Internal links to static pages are hidden while the page isn't published.
          const internal = m.url.match(/^\/(?:p\/([a-z0-9-]+)|(contact|advertise))$/);
          if (internal) {
            const ok = internal[1]
              ? pages.some((p) => p.slug === internal[1])
              : pages.some((p) => p.page_kind === (internal[2] === 'contact' ? 'contact' : 'media_kit'));
            if (!ok) return null;
          }
          return { href: menuUrl(locale, m.url), label, external: /^https?:/.test(m.url) && m.open_in_new_tab };
        }
        if (m.target_type === 'page' && m.page_id && pagesById.get(m.page_id)) {
          const p = pagesById.get(m.page_id)!;
          return { href: pageHref(locale, p.slug, p.page_kind), label, external: false };
        }
        if (m.target_type === 'category' && m.category_id && catById.get(m.category_id)) return { href: sectionHref(locale, catById.get(m.category_id)!.slug), label, external: false };
        return null;
      }).filter(Boolean) as { href: string; label: string; external: boolean }[]
    : pages.filter((p) => p.show_in_footer).map((p) => ({ href: pageHref(locale, p.slug, p.page_kind), label: p.title, external: false }));

  const legal: [string, string][] = [
    [tm('director'), v('director')],
    [tm('editorInChief'), v('editor_in_chief')],
    [tm('address'), v('address')],
    [tm('phone'), lm.phone ?? ''],
    [tm('email'), lm.email ?? ''],
    [tm('ads'), [lm.ads_email, lm.ads_phone].filter(Boolean).join(' · ')],
  ].filter(([, val]) => val) as [string, string][];

  const socials = socialLinks(settings.social_links);
  const siteName = pick(settings.site_name, locale);

  return (
    <footer className="no-print mt-16 border-t-[3px] border-rule-strong">
      <div className="container-page py-8">
        <div className="mb-6 flex flex-col items-start gap-1 border-b border-rule pb-6">
          <Nameplate settings={settings} locale={locale} size="small" />
          <p className="meta">{pick(settings.tagline, locale)}</p>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <h2 className="kicker mb-3 text-ink">{t('sections')}</h2>
            <ul className="space-y-1.5 font-ui text-[15px]">
              {top.map((c) => <li key={c.id}><Link prefetch={false} href={sectionHref(locale, c.slug)}>{categoryName(c, locale)}</Link></li>)}
            </ul>
          </div>
          <div className="col-rule">
            <h2 className="kicker mb-3 text-ink">{t('pages')}</h2>
            <ul className="space-y-1.5 font-ui text-[15px]">
              {links.map((l) => (
                <li key={l.href}>
                  {l.external ? <a href={l.href} target="_blank" rel="noopener">{l.label}</a> : <Link prefetch={false} href={l.href}>{l.label}</Link>}
                </li>
              ))}
            </ul>
          </div>
          <div className="col-rule lg:col-span-2">
            {legal.length > 0 && (
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 font-ui text-[14px]">
                {legal.map(([k, val]) => (
                  <div key={k} className="contents">
                    <dt className="text-ink-3">{k}</dt>
                    <dd><bdi>{val}</bdi></dd>
                  </div>
                ))}
              </dl>
            )}
            <p className="meta mt-4 flex flex-wrap gap-x-4 gap-y-1">
              {socials.map(([k, url]) => <a key={k} href={url} target="_blank" rel="noopener">{SOCIAL_LABELS[k]?.[locale] ?? k}</a>)}
              <a href={`/${locale}/rss.xml`}>{t('rss')}</a>
            </p>
          </div>
        </div>
        <p className="meta mt-8 border-t border-rule pt-4">{t('rights', { year: new Date().getFullYear(), site: siteName })}</p>
      </div>
    </footer>
  );
}
