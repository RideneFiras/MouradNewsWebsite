import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { securityHeaders } from './src/lib/security/headers';

const withNextIntl = createNextIntlPlugin('./src/lib/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Images are pre-processed in the admin (WebP variants) and served from
  // Supabase Storage with plain <img srcset>. No paid image optimisation.
  images: { unoptimized: true },
  // The admin editor is the only heavy client code; keep it out of the Worker.
  experimental: {
    optimizePackageImports: [],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders() }];
  },
};

export default withNextIntl(nextConfig);

// Lets `next dev` use Cloudflare bindings locally (getCloudflareContext).
if (process.env.NODE_ENV === 'development') {
  void import('@opennextjs/cloudflare').then((m) => m.initOpenNextCloudflareForDev());
}
