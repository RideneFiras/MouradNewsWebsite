import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { routing } from '@/lib/i18n/routing';

const intl = createIntlMiddleware(routing);

const PUBLIC_ADMIN_PATHS = /^\/(ar|fr)\/admin\/(login|forgot|reset)(\/|$)/;

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // "/" → the reader's last language (cookie), Arabic by default.
  if (pathname === '/') {
    const preferred = request.cookies.get('NEXT_LOCALE')?.value === 'fr' ? 'fr' : 'ar';
    return NextResponse.redirect(new URL(`/${preferred}`, request.url), 307);
  }

  // No trailing slashes (SEO doc).
  if (pathname.length > 1 && pathname.endsWith('/')) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/\/+$/, '');
    return NextResponse.redirect(url, 308);
  }

  // ?page=N on listings → internal /page/N rewrite, so listing pages stay statically
  // cached (reading searchParams would render them on every request).
  const page = request.nextUrl.searchParams.get('page');
  if (page && /^\/(ar|fr)\/(section\/[a-z0-9-]+|latest|author\/[a-z0-9-]+|topic\/[a-z0-9-]+|format\/[a-z0-9-]+)$/.test(pathname)) {
    const n = Number(page);
    const url = request.nextUrl.clone();
    url.searchParams.delete('page');
    if (!Number.isInteger(n) || n < 2 || n > 9999) return NextResponse.redirect(url, 308);
    url.pathname = `${pathname}/page/${n}`;
    return NextResponse.rewrite(url);
  }

  const isAdmin = /^\/(ar|fr)\/admin(\/|$)/.test(pathname);
  if (!isAdmin) return intl(request);

  // Admin: refresh the Supabase session cookie and require a logged-in user.
  // Role checks happen again in every server action and RLS policy.
  let response = intl(request);
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = intl(request);
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');

  if (!data.user && !PUBLIC_ADMIN_PATHS.test(pathname)) {
    const locale = pathname.split('/')[1] ?? 'ar';
    const url = new URL(`/${locale}/admin/login`, request.url);
    if (pathname !== `/${locale}/admin`) url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  // Everything except API routes, Next internals, files with an extension and feeds.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
