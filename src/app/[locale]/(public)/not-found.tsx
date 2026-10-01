import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';

export default async function NotFound() {
  const locale = ((await getLocale()) === 'fr' ? 'fr' : 'ar') as 'ar' | 'fr';
  const t = await getTranslations({ locale, namespace: 'notFound' });
  const tc = await getTranslations({ locale, namespace: 'common' });
  return (
    <div className="container-page mt-12 max-w-[var(--measure)]">
      <h1 className="headline-1">{t('title')}</h1>
      <p className="dek mt-4">{t('text')}</p>
      <form action={`/${locale}/search`} method="get" role="search" className="mt-6 flex gap-2">
        <label htmlFor="nf-q" className="sr-only">{tc('search')}</label>
        <input id="nf-q" name="q" type="search" className="input" placeholder={tc('searchPlaceholder')} />
        <button type="submit" className="btn btn-primary">{tc('search')}</button>
      </form>
      <p className="mt-6 font-ui"><Link href={`/${locale}/latest`} className="text-accent">{t('latest')}</Link> · <Link href={`/${locale}`}>{tc('home')}</Link></p>
    </div>
  );
}
