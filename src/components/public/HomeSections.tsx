import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { Lang } from '@/lib/data/types';
import type { ResolvedSection } from '@/lib/public/homepage';
import { formatHref, sectionHref, topicHref } from '@/lib/public/links';
import { AdSlot } from './AdSlot';
import { UpcomingList } from './Agenda';
import { agendaLabels } from '@/lib/public/agenda';
import { HeadlineItem, LeadStory, ListItem, NumberedItem, OpinionItem, SecondaryStory, SectionHeader } from './story';

type Of<K extends ResolvedSection['kind']> = Extract<ResolvedSection, { kind: K }>;

function LeadArea({ s, locale, latest, latestTitle, allNews }: { s: Of<'lead'>; locale: Lang; latest?: Of<'latest'>; latestTitle: string; allNews: string }) {
  const lead = (
    <div>
      <LeadStory a={s.lead} locale={locale} layout={latest ? 'stacked' : s.layout} />
      {s.secondary.length > 0 && (
        <div className="mt-6 grid gap-6 border-t border-rule pt-6 md:grid-cols-3">
          {s.secondary.map((a, i) => (
            <div key={a.id} className={i > 0 ? 'border-t border-rule pt-6 md:border-t-0 md:border-s md:ps-6 md:pt-0' : ''}>
              <SecondaryStory a={a} locale={locale} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
  if (!latest) return <section className="container-page mt-6">{lead}</section>;
  // On a phone the latest column comes right after the stories above: it skips them, so the
  // same headline isn't read twice in a row. Desktop shows the full column beside them.
  const above = new Set([s.lead.id, ...s.secondary.map((a) => a.id)]);
  const nothingNew = latest.items.every((a) => above.has(a.id));
  return (
    <section className="container-page mt-6 grid gap-8 lg:grid-cols-12 lg:gap-6">
      <div className="lg:col-span-8">{lead}</div>
      <aside className={`col-rule lg:col-span-4 ${nothingNew ? 'max-lg:hidden' : ''}`} aria-labelledby={`h-${latest.id}`}>
        <LatestColumn s={latest} locale={locale} title={latestTitle} allNews={allNews} hideOnPhone={above} />
      </aside>
    </section>
  );
}

function LatestColumn({ s, locale, title, allNews, hideOnPhone }: { s: Of<'latest'>; locale: Lang; title: string; allNews: string; hideOnPhone?: Set<string> }) {
  return (
    <>
      <SectionHeader id={`h-${s.id}`} title={s.title || title} href={`/${locale}/latest`} moreLabel={allNews} />
      <ul className="hairline-list -mt-3">
        {s.items.map((a) => <ListItem key={a.id} a={a} locale={locale} className={hideOnPhone?.has(a.id) ? 'max-lg:hidden' : ''} />)}
      </ul>
    </>
  );
}

function CategoryBlock({ s, locale, more }: { s: Of<'category'>; locale: Lang; more: string }) {
  const href = sectionHref(locale, s.category.slug);
  const [first, ...rest] = s.items;
  if (!first) return null;
  let body;
  switch (s.layout) {
    case 'three_columns':
      body = (
        <div className="grid gap-6 md:grid-cols-3">
          {s.items.slice(0, 3).map((a, i) => (
            <div key={a.id} className={i > 0 ? 'border-t border-rule pt-6 md:border-t-0 md:border-s md:ps-6 md:pt-0' : ''}>
              <SecondaryStory a={a} locale={locale} />
            </div>
          ))}
        </div>
      );
      break;
    case 'list_only':
      body = (
        <ul className="grid md:grid-cols-2 md:gap-x-6 [&>li]:border-t [&>li]:border-rule">
          {s.items.map((a) => <ListItem key={a.id} a={a} locale={locale} kicker={false} />)}
        </ul>
      );
      break;
    case 'feature_plus_list':
      body = (
        <div>
          {/* Phones: only the homepage lead keeps a big picture. */}
          <div className="lg:hidden"><SecondaryStory a={first} locale={locale} /></div>
          <div className="hidden lg:block"><LeadStory a={first} locale={locale} layout="side_by_side" priority={false} /></div>
          {rest.length > 0 && (
            <ul className="mt-4 grid border-t border-rule md:grid-cols-2 md:gap-x-6 [&>li]:border-b [&>li]:border-rule">
              {rest.map((a) => <HeadlineItem key={a.id} a={a} locale={locale} />)}
            </ul>
          )}
        </div>
      );
      break;
    case 'one_big_four_list':
    default:
      body = (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7"><SecondaryStory a={first} locale={locale} /></div>
          {rest.length > 0 && (
            <ul className="col-rule hairline-list lg:col-span-5 [&>li:first-child]:pt-0">
              {rest.map((a) => <HeadlineItem key={a.id} a={a} locale={locale} />)}
            </ul>
          )}
        </div>
      );
  }
  return (
    <section className="container-page mt-12" aria-labelledby={`h-${s.id}`}>
      <SectionHeader id={`h-${s.id}`} title={s.title} href={href} moreLabel={more} color={s.category.color} />
      {body}
    </section>
  );
}

function Grid3({ items, locale }: { items: Of<'picks'>['items']; locale: Lang }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {items.map((a, i) => (
        <div key={a.id} className={i > 0 ? 'border-t border-rule pt-6 md:border-t-0 md:pt-0 lg:border-s lg:ps-6' : ''}>
          <SecondaryStory a={a} locale={locale} />
        </div>
      ))}
    </div>
  );
}

export async function HomeSections({ sections, locale }: { sections: ResolvedSection[]; locale: Lang }) {
  const t = await getTranslations({ locale, namespace: 'common' });
  const tl = await getTranslations({ locale, namespace: 'latest' });
  const ta = await getTranslations({ locale, namespace: 'article' });
  const out = [];
  // "Upcoming dates" and "most read" are both half-width lists: shown side by side on desktop
  // (at the place of the first one), stacked on phones.
  const agendaIdx = sections.findIndex((x) => x.kind === 'agenda');
  const mostReadIdx = sections.findIndex((x) => x.kind === 'most_read');
  const paired = agendaIdx >= 0 && mostReadIdx >= 0;
  const tg = await getTranslations({ locale, namespace: 'agenda' });
  const labels = await agendaLabels(locale);
  const agendaCol = (s: Of<'agenda'>) => (
    <div key={s.id} aria-labelledby={`h-${s.id}`} role="region">
      <SectionHeader id={`h-${s.id}`} title={s.title || tg('upcoming')} href={`/${locale}/agenda`} moreLabel={tg('all')} />
      <UpcomingList events={s.events} locale={locale} labels={labels} />
    </div>
  );
  const mostReadCol = (s: Of<'most_read'>) => (
    <div key={s.id} aria-labelledby={`h-${s.id}`} role="region">
      <SectionHeader id={`h-${s.id}`} title={s.title || ta('mostRead')} />
      <ol className="hairline-list -mt-3">
        {s.items.map((a, n) => <NumberedItem key={a.id} a={a} locale={locale} n={n + 1} />)}
      </ol>
    </div>
  );
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i]!;
    if (paired && (i === agendaIdx || i === mostReadIdx)) {
      if (i === Math.min(agendaIdx, mostReadIdx)) {
        const ag = sections[agendaIdx] as Of<'agenda'>;
        const mr = sections[mostReadIdx] as Of<'most_read'>;
        out.push(
          <section key={`pair-${ag.id}`} className="container-page mt-12 grid gap-12 lg:grid-cols-2 lg:gap-6">
            {agendaCol(ag)}
            <div className="col-rule">{mostReadCol(mr)}</div>
          </section>,
        );
      }
      continue;
    }
    const next = sections[i + 1];
    switch (s.kind) {
      case 'lead': {
        const latest = next?.kind === 'latest' ? next : undefined;
        if (latest) i++;
        out.push(<LeadArea key={s.id} s={s} locale={locale} latest={latest} latestTitle={tl('title')} allNews={t('allNews')} />);
        break;
      }
      case 'latest':
        out.push(
          <section key={s.id} className="container-page mt-12 lg:max-w-[calc(var(--container)*0.5)]" aria-labelledby={`h-${s.id}`}>
            <LatestColumn s={s} locale={locale} title={tl('title')} allNews={t('allNews')} />
          </section>,
        );
        break;
      case 'category':
        out.push(<CategoryBlock key={s.id} s={s} locale={locale} more={t('more')} />);
        break;
      case 'picks':
        out.push(
          <section key={s.id} className="container-page mt-12" aria-labelledby={`h-${s.id}`}>
            {s.title && <SectionHeader id={`h-${s.id}`} title={s.title} />}
            <Grid3 items={s.items} locale={locale} />
          </section>,
        );
        break;
      case 'format':
      case 'tag':
        out.push(
          <section key={s.id} className="container-page mt-12" aria-labelledby={`h-${s.id}`}>
            <SectionHeader id={`h-${s.id}`} title={s.title} href={s.kind === 'format' ? formatHref(locale, s.format.slug) : topicHref(locale, s.tag.slug)} moreLabel={t('more')} />
            <Grid3 items={s.items} locale={locale} />
          </section>,
        );
        break;
      case 'most_read':
        out.push(<section key={s.id} className="container-page mt-12 grid lg:grid-cols-12"><div className="lg:col-span-6">{mostReadCol(s)}</div></section>);
        break;
      case 'opinion':
        out.push(
          <section key={s.id} className="container-page mt-12" aria-labelledby={`h-${s.id}`}>
            <SectionHeader id={`h-${s.id}`} title={s.title || (locale === 'fr' ? 'Opinions' : 'رأي')} href={`/${locale}/format/opinion`} moreLabel={t('more')} />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {s.items.map((a, n) => (
                <div key={a.id} className={n > 0 ? 'border-t border-rule pt-6 md:border-t-0 md:pt-0 lg:border-s lg:ps-6' : ''}>
                  <OpinionItem a={a} locale={locale} />
                </div>
              ))}
            </div>
          </section>,
        );
        break;
      case 'agenda':
        out.push(<section key={s.id} className="container-page mt-12 grid lg:grid-cols-12"><div className="lg:col-span-6">{agendaCol(s)}</div></section>);
        break;
      case 'ad':
        out.push(<AdSlot key={s.id} slotKey={s.slotKey} locale={locale} className="container-page mt-12" />);
        break;
      case 'text':
        out.push(
          <section key={s.id} className="container-page mt-12">
            <div className="max-w-[var(--measure)] border-s-[3px] border-accent ps-4 font-body text-[19px] leading-[1.8] whitespace-pre-line">{s.text}</div>
          </section>,
        );
        break;
    }
  }
  // Two "most read" + "opinion" style blocks look fine one after another; nothing else to compose.
  return <>{out}</>;
}

export function HomeEmpty({ locale }: { locale: Lang }) {
  return (
    <div className="container-page mt-10">
      <p className="dek">{locale === 'fr' ? 'Aucun article publié pour le moment.' : 'لا توجد مقالات منشورة بعد.'}</p>
      <p className="meta mt-2"><Link prefetch={false} href={`/${locale}/admin`}>{locale === 'fr' ? 'Administration' : 'لوحة التحكم'}</Link></p>
    </div>
  );
}
