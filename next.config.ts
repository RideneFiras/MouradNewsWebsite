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
  // Not using experimental.inlineCss: it inlines the stylesheet into every HTML page AND
  // repeats it as a string in the RSC payload (~115 KB per page, never cached). A normal
  // stylesheet is downloaded once and cached across pages (DECISIONS.md, Phase 5).
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders() }];
  },
};

export default withNextIntl(nextConfig);

// Lets `next dev` use Cloudflare bindings locally (getCloudflareContext).
if (process.env.NODE_ENV === 'development') {
  void import('@opennextjs/cloudflare').then((m) => m.initOpenNextCloudflareForDev());
}
