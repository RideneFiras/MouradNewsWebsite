import { notFound } from 'next/navigation';
import { listCards } from '@/lib/data/queries';
import type { ArticleCard } from '@/lib/data/types';
import type { AppLocale } from '@/lib/i18n/routing';
import { HeadlineItem, LeadStory, ListItem, NumberedItem, OpinionItem, SecondaryStory, SectionHeader } from '@/components/public/story';

// Dev-only component gallery (docs/02 "Components"). 404 in production builds.
export const dynamic = 'force-dynamic';

export default async function DevComponents({ params }: { params: Promise<{ locale: AppLocale }> }) {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEV_COMPONENTS !== '1') notFound();
  const { locale } = await params;
  const { items } = await listCards({ langs: ['ar', 'fr'], limit: 40 });
  if (!items.length) return <p className="container-page mt-8">Load demo content first (supabase/demo-seed.sql).</p>;
  const withImg = items.find((a) => a.cover) ?? items[0]!;
  const noImg: ArticleCard = { ...withImg, cover: null };
  const long: ArticleCard = { ...noImg, title: items.reduce((x, a) => (a.title.length > x.length ? a.title : x), '') };
  const mixed: ArticleCard = { ...noImg, title: '[تجريبي] الكرة الطائرة: Club Sportif Sfaxien يفوز على النادي الإفريقي 3-1 في 21:38' };
  const fr = items.find((a) => a.language === 'fr') ?? noImg;
  const opinion = items.find((a) => a.format_is_opinion) ?? noImg;
  const sponsored = items.find((a) => a.is_sponsored) ?? noImg;
  const Box = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="mt-12"><SectionHeader title={title} /><div className="grid gap-8 lg:grid-cols-2">{children}</div></section>
  );
  return (
    <div className="container-page mt-8">
      <h1 className="headline-1">Components / المكوّنات</h1>
      <Box title="Lead story"><LeadStory a={withImg} locale={locale} layout="stacked" /><LeadStory a={long} locale={locale} /></Box>
      <Box title="Lead side by side"><div className="lg:col-span-2"><LeadStory a={withImg} locale={locale} layout="side_by_side" /></div></Box>
      <Box title="Secondary"><SecondaryStory a={withImg} locale={locale} /><SecondaryStory a={noImg} locale={locale} /></Box>
      <Box title="Secondary horizontal"><SecondaryStory a={withImg} locale={locale} horizontal /><SecondaryStory a={long} locale={locale} horizontal /></Box>
      <Box title="Lists"><ul className="hairline-list">{[withImg, mixed, fr, long].map((a, i) => <ListItem key={i} a={a} locale={locale} thumb />)}</ul>
        <ol className="hairline-list">{[withImg, mixed, fr].map((a, i) => <NumberedItem key={i} a={a} locale={locale} n={i + 1} />)}</ol></Box>
      <Box title="Headline / opinion / sponsored"><ul className="hairline-list"><HeadlineItem a={mixed} locale={locale} /><HeadlineItem a={fr} locale={locale} /></ul>
        <div className="space-y-6"><OpinionItem a={opinion} locale={locale} /><SecondaryStory a={sponsored} locale={locale} /></div></Box>
      <section className="mt-12">
        <SectionHeader title="Buttons and forms" />
        <div className="flex flex-wrap gap-3"><button className="btn btn-primary">زر أساسي</button><button className="btn">زر ثانوي</button></div>
        <input className="input mt-4 max-w-md" placeholder="حقل نص" />
      </section>
    </div>
  );
}
