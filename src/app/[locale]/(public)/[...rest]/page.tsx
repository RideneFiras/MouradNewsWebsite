import { redirectOr404 } from '@/lib/public/route-helpers';

// Any unknown public URL: an old (renamed) address redirects, everything else is a 404.
export default async function CatchAll({ params }: { params: Promise<{ locale: string; rest: string[] }> }) {
  const { locale, rest } = await params;
  return redirectOr404(`/${locale}/${rest.map(decodeURIComponent).join('/')}`);
}
