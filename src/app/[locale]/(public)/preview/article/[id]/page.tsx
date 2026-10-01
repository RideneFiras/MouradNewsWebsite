import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArticleView } from '@/components/public/ArticleView';
import { getSettings } from '@/lib/data/queries';
import { getArticleForPreview } from '@/lib/data/preview';
import { verifyPreviewToken } from '@/lib/admin/preview-token';
import type { AppLocale } from '@/lib/i18n/routing';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PreviewArticle({ params, searchParams }: {
  params: Promise<{ locale: AppLocale; id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const ok = /^[0-9a-f-]{36}$/.test(id) && (await verifyPreviewToken('article', id, String(sp.t ?? ''), Number(sp.e)));
  if (!ok) notFound();
  const a = await getArticleForPreview(id);
  if (!a) notFound();
  const t = await getTranslations({ locale, namespace: 'common' });
  return (
    <>
      <p className="bg-ink py-2 text-center font-ui text-[14px] font-semibold text-paper">{t('previewBanner')}</p>
      <ArticleView a={a} locale={locale} settings={await getSettings()} related={[]} moreFromSection={[]} mostRead={[]} preview />
    </>
  );
}
