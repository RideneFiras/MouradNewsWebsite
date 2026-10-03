import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { ArticleCard, Category, Lang, StaticPage } from '@/lib/data/types';
import type { SiteSettings } from '@/lib/data/settings';
import { pick } from '@/lib/data/settings';
import { formatDate, formatHijri } from '@/lib/format/date';
import { articleHref, pageHref, sectionHref } from '@/lib/public/links';
import { categoryName } from '@/lib/public/labels';
import { SearchIcon } from '@/components/shared/icons';
import { BreakingBar } from './BreakingBar';
import { LangSwitch } from './LangSwitch';
import { MobileMenu } from './MobileMenu';
import { Nameplate } from './Nameplate';
import { SOCIAL_LABELS, socialLinks } from '@/lib/public/social';

export async function Masthead({ locale, settings, categories, pages, latest, breaking }: {
  locale: Lang;
  settings: SiteSettings;
  categories: Category[];
  pages: StaticPage[];
  latest: ArticleCard | null;
  breaking: ArticleCard[];
}) {
  const t = await getTranslations({ locale, namespace: 'common' });
  const now = new Date();
  const top = categories.filter((c) => !c.parent_id && c.show_in_nav);
  const childrenOf = (id: string) => categories.filter((c) => c.parent_id === id);
  const socials = socialLinks(settings.social_links);
  const hijri = settings.show_hijri_date.enabled ? formatHijri(now, locale, settings.show_hijri_date.offset_days) : '';
  const earEnd = locale === 'fr' ? settings.masthead_ears.end_fr : settings.masthead_ears.end_ar;
  const tagline = pick(settings.tagline, locale);
  // The French interface can be hidden from readers (Settings); the admin stays bilingual.
  const frPublic = settings.public_languages?.fr !== false || locale === 'fr';

  const searchForm = (
    <form action={`/${locale}/search`} method="get" role="search" className="container-page flex gap-2 py-3">
      <label htmlFor="masthead-q" className="sr-only">{t('search')}</label>
      <input id="masthead-q" name="q" type="search" className="input" placeholder={t('searchPlaceholder')} required />
      <button type="submit" className="btn btn-primary">{t('search')}</button>
    </form>
  );

  return (
    <header className="no-print-border">
      <a href="#content" className="skip-link">{t('skipToContent')}</a>

      {/* 1. Utility bar (desktop) */}
      <div className="relative hidden border-b border-rule lg:block">
        <div className="container-page meta flex h-8 items-center justify-between text-ink-2">
          <p>
            <time dateTime={now.toISOString()}>{formatDate(now, locale, 'full')}</time>
            {hijri && <span> · <span lang="ar">{hijri}</span></span>}
          </p>
          <div className="flex items-center gap-4">
            {frPublic && <LangSwitch locale={locale} />}
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-1 hover:text-accent" aria-label={t('search')}>
                <SearchIcon size={18} />
              </summary>
              <div className="absolute inset-x-0 z-40 mt-2 border-b border-rule bg-paper">{searchForm}</div>
            </details>
            {socials.map(([k, url]) => (
              <a key={k} href={url} rel="noopener" target="_blank" className="hover:text-accent">
                {SOCIAL_LABELS[k]?.[locale] ?? k}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Nameplate: desktop with ears, mobile compact with menu/search */}
      <div className="container-page">
        <div className="flex h-14 items-center justify-between lg:hidden">
          <MobileMenu
            locale={locale}
            showLang={frPublic}
            labels={{ menu: t('menu'), close: t('close'), sections: t('sections'), pages: t('pages') }}
            sections={top.map((c) => ({
              href: sectionHref(locale, c.slug),
              label: categoryName(c, locale),
              children: childrenOf(c.id).map((s) => ({ href: sectionHref(locale, s.slug), label: categoryName(s, locale) })),
            }))}
            pages={pages.filter((p) => p.show_in_footer).map((p) => ({ href: pageHref(locale, p.slug, p.page_kind), label: p.title }))}
          />
          <Nameplate settings={settings} locale={locale} size="compact" />
          <Link prefetch={false} href={`/${locale}/search`} className="inline-flex h-11 w-11 items-center justify-center" aria-label={t('search')}>
            <SearchIcon />
          </Link>
        </div>
        <div className="hidden grid-cols-[1fr_auto_1fr] items-center gap-6 py-5 lg:grid">
          <div className="meta max-w-[16rem] justify-self-start border-s-2 border-accent ps-3">
            {settings.masthead_ears.start === 'latest' && latest && (
              <>
                <span className="kicker block">{t('latestEar')}</span>
                <Link prefetch={false} href={articleHref(latest)} className="font-headline text-[16px] leading-snug font-semibold text-ink hover:text-accent"
                  lang={latest.language !== locale ? latest.language : undefined}>
                  {latest.title}
                </Link>
              </>
            )}
          </div>
          <div className="text-center">
            <Nameplate settings={settings} locale={locale} />
            {tagline && <p className="meta mt-1">{tagline}</p>}
          </div>
          <div className="meta max-w-[16rem] justify-self-end border-e-2 border-accent pe-3 text-end">{earEnd}</div>
        </div>
      </div>

      {/* 3. Double rule */}
      <div className="container-page"><div className="double-rule" /></div>

      {/* 4. Section nav: scrollable strip on mobile, dropdowns on desktop; slim sticky bar on desktop */}
      <nav aria-label={t('sections')} className="masthead-nav z-30 border-b border-rule bg-paper lg:sticky lg:top-0">
        <div className="container-page flex items-center gap-4">
          <span className="masthead-mini shrink-0"><Nameplate settings={settings} locale={locale} size="small" /></span>
          <ul className="flex flex-1 gap-5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] lg:gap-6 lg:overflow-visible">
            {top.map((c) => {
              const kids = childrenOf(c.id);
              return (
                <li key={c.id} className="group relative">
                  <Link prefetch={false} href={sectionHref(locale, c.slug)} data-section={c.slug}
                    className="nav-link inline-flex min-h-11 items-center border-b-2 border-transparent font-ui text-[15px] font-semibold lg:text-[16px]">
                    {categoryName(c, locale)}
                  </Link>
                  {kids.length > 0 && (
                    <ul className="invisible absolute start-0 top-full z-40 hidden min-w-48 border border-rule bg-paper py-1 group-focus-within:visible group-hover:visible lg:block">
                      {kids.map((k) => (
                        <li key={k.id}>
                          <Link prefetch={false} href={sectionHref(locale, k.slug)} className="block px-4 py-2 font-ui text-[15px] hover:text-accent">{categoryName(k, locale)}</Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
            <li>
              <Link prefetch={false} href={`/${locale}/latest`} className="nav-link inline-flex min-h-11 items-center border-b-2 border-transparent font-ui text-[15px] font-semibold text-ink-2 lg:text-[16px]">
                {t('allNews')}
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* 5. Breaking bar */}
      {settings.breaking.enabled && breaking.length > 0 && (
        <BreakingBar locale={locale} label={t('breaking')} items={breaking.map((b) => ({ href: articleHref(b), title: b.title, lang: b.language }))} />
      )}
    </header>
  );
}
