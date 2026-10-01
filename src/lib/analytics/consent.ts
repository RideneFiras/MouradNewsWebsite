// EEA (EU + Iceland, Liechtenstein, Norway) + UK + Switzerland: regions where Google
// requires consent before ad/analytics storage (Consent Mode v2). Elsewhere: granted.
export const CONSENT_REGIONS = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'CH',
];

/** Inline script run before gtag.js / AdSense: region-specific Consent Mode v2 defaults. */
export function consentDefaultsScript(): string {
  const denied = { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' };
  const granted = { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' };
  return [
    'window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;',
    `gtag('consent','default',${JSON.stringify({ ...denied, region: CONSENT_REGIONS, wait_for_update: 500 })});`,
    `gtag('consent','default',${JSON.stringify(granted)});`,
    "gtag('set','ads_data_redaction',true);",
  ].join('');
}
