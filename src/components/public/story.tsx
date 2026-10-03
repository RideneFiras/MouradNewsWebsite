import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import type { ArticleCard, Lang } from '@/lib/data/types';
import { formatListTime } from '@/lib/format/date';
import { articleHref, authorHref } from '@/lib/public/links';
import { bylineNames, dirOfLang, kickerOf } from '@/lib/public/labels';
import { Img } from './Img';

const AR = { by: 'بقلم', and: ' و', sponsored: 'محتوى برعاية' };
const FR = { by: 'Par', and: ' et ', sponsored: 'Contenu sponsorisé' };
const words = (l: Lang) => (l === 'fr' ? FR : AR);

/** Puts lang/dir on an item only when its language differs from the page. */
function ItemFrame({ a, locale, as: Tag = 'article', className = '', children, style }: {
  a: ArticleCard; locale: Lang; as?: 'article' | 'li' | 'div'; className?: string; children: ReactNode; style?: CSSProperties;
}) {
  const foreign = a.language !== locale;
  return (
    <Tag className={className} lang={foreign ? a.language : undefined} dir={foreign ? dirOfLang(a.language) : undefined} style={style}>
      {children}
    </Tag>
  );
}

export function Kicker({ a, locale }: { a: ArticleCard; locale: Lang }) {
  const foreign = a.language !== locale;
  return (
    <p className="kicker mb-1.5" style={{ '--kicker': a.category_color } as CSSProperties}>
      {foreign && <span className="me-2 border border-current px-1 text-[11px] leading-none">{a.language.toUpperCase()}</span>}
      <bdi>{kickerOf(a)}</bdi>
    </p>
  );
}

export function MetaLine({ a, withTime = true, withLocation = true, linkAuthors = true, className = '' }: {
  a: ArticleCard; withTime?: boolean; withLocation?: boolean; linkAuthors?: boolean; className?: string;
}) {
  const w = words(a.language);
  const parts: ReactNode[] = [];
  if (a.is_sponsored) {
    parts.push(<span key="s">{w.sponsored} <bdi>{a.sponsor_name}</bdi></span>);
  } else {
    const names = bylineNames(a);
    if (names.length) {
      parts.push(
        <span key="b">
          {w.by}{' '}
          {names.map((n, i) => (
            <span key={i}>
              {i > 0 && w.and}
              {n.slug && linkAuthors ? (
                <Link prefetch={false} href={authorHref(a.language, n.slug)} className="hover:text-accent"><bdi>{n.name}</bdi></Link>
              ) : (
                <bdi>{n.name}</bdi>
              )}
            </span>
          ))}
        </span>,
      );
    }
  }
  if (withLocation && a.location) parts.push(<bdi key="l">{a.location}</bdi>);
  if (withTime) parts.push(<time key="t" dateTime={a.published_at}>{formatListTime(a.published_at, a.language)}</time>);
  return (
    <p className={`meta ${className}`}>
      {parts.map((p, i) => (
        <span key={i}>
          {i > 0 && <span aria-hidden="true"> · </span>}
          {p}
        </span>
      ))}
    </p>
  );
}

function Title({ a, className, as: H = 'h3' }: { a: ArticleCard; className: string; as?: 'h2' | 'h3' }) {
  return (
    <H className={className}>
      <Link prefetch={false} href={articleHref(a)} className="hover:text-accent">{a.title}</Link>
    </H>
  );
}

function Caption({ a }: { a: ArticleCard }) {
  const m = a.cover;
  if (!m) return null;
  const cap = a.cover_caption || (a.language === 'fr' ? m.caption_fr || m.caption_ar : m.caption_ar || m.caption_fr) || '';
  const credit = a.cover_credit || m.credit || '';
  if (!cap && !credit) return null;
  return (
    <figcaption className="caption mt-1.5">
      {cap && <bdi>{cap}</bdi>}{cap && credit && ' · '}{credit && <bdi>{credit}</bdi>}
    </figcaption>
  );
}

/** Lead story. layout "side_by_side" = image 7 cols + text 5 cols on desktop; "stacked" otherwise. */
export function LeadStory({ a, locale, layout = 'stacked', priority = true }: { a: ArticleCard; locale: Lang; layout?: 'side_by_side' | 'stacked'; priority?: boolean }) {
  const side = layout === 'side_by_side' && a.cover;
  return (
    <ItemFrame a={a} locale={locale} className={`${a.is_sponsored ? 'bg-paper-2 p-4' : ''} ${side ? 'grid gap-4 lg:grid-cols-12 lg:gap-6' : ''}`}>
      {a.cover && (
        <figure className={side ? 'lg:col-span-7' : 'mb-4'}>
          <Link prefetch={false} href={articleHref(a)} tabIndex={-1} aria-hidden="true">
            <Img media={a.cover} lang={a.language} alt={a.cover_alt} priority={priority} sizes="(min-width: 1024px) 760px, 100vw" />
          </Link>
          <Caption a={a} />
        </figure>
      )}
      <div className={side ? 'lg:col-span-5' : ''}>
        <Kicker a={a} locale={locale} />
        <Title a={a} as="h2" className="lead-headline" />
        {(a.subtitle || a.excerpt) && <p className="dek mt-3">{a.subtitle || a.excerpt}</p>}
        <MetaLine a={a} className="mt-3" />
      </div>
    </ItemFrame>
  );
}

/**
 * Secondary story: optional 3:2 image, kicker, headline-2, excerpt (clamped to 3 lines), meta.
 * On phones (below lg) it becomes a compact row: headline first, a small picture at the end
 * side, no excerpt. Only the lead story keeps a full-width picture on a phone, so the page has
 * a hierarchy and stays short.
 */
export function SecondaryStory({ a, locale, image = true, horizontal = false, excerpt = true }: {
  a: ArticleCard; locale: Lang; image?: boolean; horizontal?: boolean; excerpt?: boolean;
}) {
  const showImg = image && a.cover;
  const compact = !horizontal && showImg; // phone layout of the stacked card
  return (
    <ItemFrame a={a} locale={locale} className={`${a.is_sponsored ? 'bg-paper-2 p-3' : ''} ${horizontal && showImg ? 'grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]' : ''} ${compact ? 'max-lg:flex max-lg:items-start max-lg:gap-3' : ''}`}>
      {showImg && a.cover && (
        <Link prefetch={false} href={articleHref(a)} tabIndex={-1} aria-hidden="true" className={horizontal ? '' : 'mb-3 block max-lg:order-2 max-lg:mb-0 max-lg:w-28 max-lg:shrink-0'}>
          <Img media={a.cover} lang={a.language} alt={a.cover_alt} ratio={horizontal ? '4/3' : '3/2'} sizes="(min-width: 1024px) 400px, 112px" />
        </Link>
      )}
      <div className={compact ? 'max-lg:min-w-0 max-lg:flex-1' : ''}>
        <Kicker a={a} locale={locale} />
        <Title a={a} className={`headline-2 ${compact ? 'max-lg:text-[19px] max-lg:leading-snug' : ''}`} />
        {excerpt && (a.subtitle || a.excerpt) && <p className={`excerpt clamp-3 mt-2 ${compact ? 'max-lg:hidden' : ''}`}>{a.subtitle || a.excerpt}</p>}
        <MetaLine a={a} className="mt-2" />
      </div>
    </ItemFrame>
  );
}

/** List item: fixed-width time column + headline-3 + optional kicker. */
export function ListItem({ a, locale, kicker = true, thumb = false, className = '' }: { a: ArticleCard; locale: Lang; kicker?: boolean; thumb?: boolean; className?: string }) {
  return (
    <ItemFrame a={a} locale={locale} as="li" className={`flex gap-3 py-3 ${a.is_sponsored ? 'bg-paper-2 px-2' : ''} ${className}`}>
      <time dateTime={a.published_at} className="meta w-[4.5rem] shrink-0 pt-1 tabular-nums">
        {formatListTime(a.published_at, a.language)}
      </time>
      <div className="min-w-0 flex-1">
        {kicker && <Kicker a={a} locale={locale} />}
        <Title a={a} className="headline-3" />
      </div>
      {thumb && a.cover && (
        <Link prefetch={false} href={articleHref(a)} tabIndex={-1} aria-hidden="true" className="hidden w-28 shrink-0 lg:block">
          <Img media={a.cover} lang={a.language} alt={a.cover_alt} ratio="4/3" sizes="112px" />
        </Link>
      )}
    </ItemFrame>
  );
}

/** Compact headline without time (side columns, related). */
export function HeadlineItem({ a, locale }: { a: ArticleCard; locale: Lang }) {
  return (
    <ItemFrame a={a} locale={locale} as="li" className="py-3">
      <Kicker a={a} locale={locale} />
      <Title a={a} className="headline-3" />
    </ItemFrame>
  );
}

export function NumberedItem({ a, locale, n }: { a: ArticleCard; locale: Lang; n: number }) {
  return (
    <ItemFrame a={a} locale={locale} as="li" className="flex items-start gap-3 py-3">
      <span className="font-headline w-8 shrink-0 text-[32px] leading-none font-semibold text-ink-3" aria-hidden="true">{n}</span>
      <div className="min-w-0">
        <Title a={a} className="headline-3" />
      </div>
    </ItemFrame>
  );
}

export function OpinionItem({ a, locale }: { a: ArticleCard; locale: Lang }) {
  const author = a.authors[0];
  const name = a.byline_override || (author ? (a.language === 'fr' ? author.name_fr : null) || author.name_ar : '');
  return (
    <ItemFrame a={a} locale={locale} className="flex items-start gap-3">
      {author?.avatar && (
        <div className="w-14 shrink-0 grayscale">
          <Img media={author.avatar} lang={a.language} alt="" ratio="1/1" sizes="56px" />
        </div>
      )}
      <div className="min-w-0">
        {name && (
          <p className="kicker mb-1">
            {author?.linkable && !a.byline_override ? <Link prefetch={false} href={authorHref(a.language, author.slug)}><bdi>{name}</bdi></Link> : <bdi>{name}</bdi>}
          </p>
        )}
        <Title a={a} className="headline-3" />
      </div>
    </ItemFrame>
  );
}

/** Section header: title, 2px rule with accent notch, optional "more" link at inline-end. */
export function SectionHeader({ title, href, moreLabel, color, as: H = 'h2', id }: {
  title: string; href?: string; moreLabel?: string; color?: string; as?: 'h1' | 'h2'; id?: string;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-end justify-between gap-4 pb-2">
        <H id={id} className="section-title">{href ? <Link prefetch={false} href={href} className="hover:text-accent">{title}</Link> : title}</H>
        {href && moreLabel && (
          <Link prefetch={false} href={href} className="meta shrink-0 hover:text-accent">
            {moreLabel} <span aria-hidden="true" className="inline-block rtl:rotate-0 ltr:-scale-x-100">←</span>
          </Link>
        )}
      </div>
      <div className="section-rule" style={color ? ({ '--notch': color } as CSSProperties) : undefined} />
    </div>
  );
}
