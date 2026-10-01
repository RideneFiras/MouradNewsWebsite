// Security headers for every response (docs/03-architecture.md, "Security").
// The CSP is necessarily permissive for Google AdSense / GA4 (they inject scripts,
// iframes and images from many Google hosts). 'unsafe-inline' scripts are needed
// because pages are statically cached (no per-request nonce). See DECISIONS.md.

const GOOGLE = [
  'https://*.google.com',
  'https://*.googlesyndication.com',
  'https://*.doubleclick.net',
  'https://*.googletagmanager.com',
  'https://*.google-analytics.com',
  'https://*.analytics.google.com',
  'https://*.gstatic.com',
  'https://*.googleadservices.com',
  'https://*.adtrafficquality.google',
  'https://fundingchoicesmessages.google.com',
];

export function contentSecurityPolicy(supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''): string {
  const supabase = supabaseUrl ? new URL(supabaseUrl).origin : '';
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", ...GOOGLE],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', 'https:', supabase].filter(Boolean),
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", supabase, supabase.replace(/^http/, 'ws'), ...GOOGLE].filter(Boolean),
    'frame-src': [
      "'self'",
      'https://www.youtube-nocookie.com',
      'https://www.youtube.com',
      'https://www.facebook.com',
      'https://web.facebook.com',
      ...GOOGLE,
    ],
    'media-src': ["'self'", 'https:'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'self'"],
  };
  return Object.entries(directives)
    .map(([k, v]) => `${k} ${v.join(' ')}`)
    .join('; ');
}

export function securityHeaders(): { key: string; value: string }[] {
  return [
    { key: 'Content-Security-Policy', value: contentSecurityPolicy() },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  ];
}
