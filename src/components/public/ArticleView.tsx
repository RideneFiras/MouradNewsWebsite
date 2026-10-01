import Link from 'next/link';
import type { CSSProperties } from 'react';
import { getTranslations } from 'next-intl/server';
import type { ArticleCard, ArticleFull, Lang } from '@/lib/data/types';
import type { SiteSettings } from '@/lib/data/settings';
import { formatDate } from '@/lib/format/date';
import { buildBody } from '@/lib/public/article-body';
import { authorHref, sectionHref, topicHref } from '@/lib/public/links';
import { bylineNames, kickerOf, tagName } from '@/lib/public/labels';
import { siteUrl } from '@/lib/env';
import { AdSlot } from './AdSlot';
import { Img } from './Img';
import { ShareRow } from './ShareRow';
import { HeadlineItem, ListItem, SectionHeader } from './story';
import { SideColumn } from './SideColumn';

export async function ArticleView({ a, locale, settings, related, moreFromSection, mostRead, authorBio = null, preview = false }: {
  a: ArticleFull; locale: Lang; settings: SiteSettings; related: ArticleCard[]; moreFromSection: ArticleCard[]; mostRead: ArticleCard[]; authorBio?: string | null; preview?: boolean;
}) {
  const lang = a.language;
  const t = await getTranslations({ locale: lang, namespace: 'article' });
  const tt = await getTranslations({ locale: lang, namespace: 'time' });
  const tc = await getTranslations({ locale: lang, namespace: 'common' });
  const url = `${siteUrl()}/${lang}/article/${a.public_id}${a.slug ? `/${encodeURIComponent(a.slug)}` : ''}`;
  const names = bylineNames(a);
  const adsAllowed = a.allow_ads && !a.is_sponsored && !preview;
  const chunks = buildBody(a.body_html, {
    location: a.location,
    ads: adsAllowed,
    afterParagraphs: settings.in_article_ads.after_paragraphs ?? [3, 8],
    minParagraphs: settings.in_article_ads.min_paragraphs ?? 5,
  });
  const m = a.cover;
  const caption = m ? a.cover_caption || (lang === 'fr' ? m.caption_fr || m.caption_ar : m.caption_ar || m.caption_fr) : null;
  const credit = m ? a.cover_credit || m.credit : null;
  const correction = lang === 'fr' ? a.correction_note_fr || a.correction_note_ar : a.correction_note_ar || a.correction_note_fr;
  const primary = a.authors[0];
  const sectionName = (lang === 'fr' ? a.category_name_fr : null) || a.category_name_ar;

  return (
    <div className="container-page mt-8" lang={lang !== locale ? lang : undefined}>
      <span hidden data-active-section={a.category_slug} data-track-article={preview ? undefined : a.public_id} data-track-section={a.category_slug}
        data-track-author={a.authors[0] ? a.authors[0].name_ar : ''} />
      <div className="grid lg:grid-cols-12 lg:gap-6">
        <article className="lg:col-span-8" aria-labelledby="article-title">
          <div className="mx-auto max-w-[var(--measure)]">
            {a.is_sponsored && (
              <p className="mb-4 bg-paper-2 px-3 py-2 font-ui text-[14px] font-semibold text-ink-2">
                {tc('sponsoredBy', { sponsor: a.sponsor_name ?? '' })}
              </p>
            )}
            <p className="kicker mb-2" style={{ '--kicker': a.category_color } as CSSProperties}>
              <Link prefetch={false} href={sectionHref(lang, a.category_slug)}><bdi>{kickerOf(a)}</bdi></Link>
            </p>
            <h1 id="article-title" className="headline-1">{a.title}</h1>
            {a.subtitle && <p className="dek mt-4">{a.subtitle}</p>}

            <div className="mt-5 border-y border-rule py-3">
              <p className="meta">
                {!a.is_sponsored && names.length > 0 && (
                  <span className="font-semibold text-ink-2">
                    {tc('by')}{' '}
                    {names.map((n, i) => (
                      <span key={i}>
                        {i > 0 && ` ${tc('and')} `}
                        {n.slug ? <Link prefetch={false} href={authorHref(lang, n.slug)} className="hover:text-accent"><bdi>{n.name}</bdi></Link> : <bdi>{n.name}</bdi>}
                      </span>
                    ))}
                  </span>
                )}
              </p>
              <p className="meta mt-1">
                <time dateTime={a.first_published_at ?? a.published_at}>{tt('published', { date: `${formatDate(a.published_at, lang, 'full')} ${formatDate(a.published_at, lang, 'time')}` })}</time>
                {a.content_updated_at && (
                  <> · <time dateTime={a.content_updated_at}>{tt('updated', { date: `${formatDate(a.content_updated_at, lang, 'short')} ${formatDate(a.content_updated_at, lang, 'time')}` })}</time></>
                )}
                {' · '}{tt('readingTime', { count: a.reading_minutes })}
              </p>
              <div className="no-print mt-3">
                <ShareRow url={url} title={a.title} labels={{ share: t('share'), facebook: t('shareFacebook'), whatsapp: t('shareWhatsapp'), x: t('shareX'), copy: t('copyLink'), copied: t('copied') }} />
              </div>
            </div>
          </div>

          {m && (
            <figure className="mt-6">
              <Img media={m} lang={lang} alt={a.cover_alt} priority sizes="(min-width: 1024px) 800px, 100vw" />
              {(caption || credit) && <figcaption className="caption mx-auto mt-2 max-w-[var(--measure)]">{caption && <bdi>{caption}</bdi>}{caption && credit && ' · '}{credit && <bdi>{credit}</bdi>}</figcaption>}
            </figure>
          )}

          <div className="mx-auto mt-8 max-w-[var(--measure)]" data-article-body>
            {chunks.map((c, i) => (
              <div key={i}>
                <div className="prose-article" dangerouslySetInnerHTML={{ __html: c.html }} />
                {c.adAfter && <AdSlot slotKey={c.adAfter} locale={lang} categoryId={a.category_id} className="my-8" />}
              </div>
            ))}

            {a.tags.length > 0 && (
              <p className="meta mt-10 border-t border-rule pt-4">
                <span className="font-semibold text-ink-2">{t('tags')}: </span>
                {a.tags.map((tag, i) => (
                  <span key={tag.id}>
                    {i > 0 && <span aria-hidden="true"> · </span>}
                    <Link prefetch={false} href={topicHref(lang, tag.slug)} className="hover:text-accent"><bdi>{tagName(tag, lang)}</bdi></Link>
                  </span>
                ))}
              </p>
            )}

            {correction && (
              <aside className="mt-8 border border-rule-strong p-4" aria-labelledby="correction-title">
                <h2 id="correction-title" className="kicker mb-2">{t('correction')}</h2>
                <p className="font-body text-[17px] leading-relaxed">{correction}</p>
              </aside>
            )}

            {primary && !a.byline_override && (
              <aside className="no-print mt-10 flex gap-4 border-t-2 border-rule-strong pt-4" aria-label={t('aboutAuthor')}>
                {primary.avatar && <div className="w-16 shrink-0"><Img media={primary.avatar} lang={lang} alt="" ratio="1/1" sizes="64px" /></div>}
                <div>
                  <p className="kicker mb-1 text-ink">{t('aboutAuthor')}</p>
                  <p className="headline-3"><bdi>{(lang === 'fr' ? primary.name_fr : null) || primary.name_ar}</bdi></p>
                  {(lang === 'fr' ? primary.title_fr : null) || primary.title_ar ? <p className="meta">{(lang === 'fr' ? primary.title_fr : null) || primary.title_ar}</p> : null}
                  {authorBio && <p className="excerpt mt-2">{authorBio}</p>}
                  {primary.linkable && (
                    <Link prefetch={false} href={authorHref(lang, primary.slug)} className="meta mt-1 inline-block text-accent">
                      {t('allArticlesBy', { name: (lang === 'fr' ? primary.name_fr : null) || primary.name_ar })}
                    </Link>
                  )}
                </div>
              </aside>
            )}

            {related.length > 0 && (
              <section className="no-print mt-10" aria-labelledby="related-title">
                <SectionHeader id="related-title" title={t('related')} />
                <ul className="hairline-list -mt-3">{related.map((r) => <ListItem key={r.id} a={r} locale={lang} />)}</ul>
              </section>
            )}
            {adsAllowed && <AdSlot slotKey="article_end" locale={lang} categoryId={a.category_id} className="mt-10" />}
          </div>
        </article>

        <SideColumn locale={lang} mostRead={mostRead} categoryId={a.category_id}>
          {moreFromSection.length > 0 && (
            <section>
              <SectionHeader title={t('moreFromSection', { section: sectionName })} href={sectionHref(lang, a.category_slug)} />
              <ul className="hairline-list -mt-3">{moreFromSection.map((r) => <HeadlineItem key={r.id} a={r} locale={lang} />)}</ul>
            </section>
          )}
        </SideColumn>
      </div>
    </div>
  );
}
