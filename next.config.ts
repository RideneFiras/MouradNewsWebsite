import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { securityHeaders } from './src/lib/security/headers';

const withNextIntl = createNextIntlPlugin('./src/lib/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  env: { NEXT_PUBLIC_BUILD_TIME: new Date().toISOString() },
  // Images are pre-processed in the admin (WebP variants) and served from
  // Supabase Storage with plain <img srcset>. No paid image optimisation.
  images: { unoptimized: true },
  // Inline the (small) stylesheet into the HTML: removes the render-blocking CSS request.
  experimental: { inlineCss: true },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders() }];
  },
};

export default withNextIntl(nextConfig);

// Lets `next dev` use Cloudflare bindings locally (getCloudflareContext).
if (process.env.NODE_ENV === 'development') {
  void import('@opennextjs/cloudflare').then((m) => m.initOpenNextCloudflareForDev());
}
