export const SOCIAL_LABELS: Record<string, { ar: string; fr: string }> = {
  facebook: { ar: 'فيسبوك', fr: 'Facebook' },
  instagram: { ar: 'إنستغرام', fr: 'Instagram' },
  youtube: { ar: 'يوتيوب', fr: 'YouTube' },
  x: { ar: 'إكس', fr: 'X' },
  whatsapp_channel: { ar: 'قناة واتساب', fr: 'Chaîne WhatsApp' },
};

export function socialLinks(links: Record<string, string> | undefined): [string, string][] {
  return Object.entries(links ?? {}).filter(([k, url]) => k in SOCIAL_LABELS && typeof url === 'string' && /^https:\/\//.test(url));
}
