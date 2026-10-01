export type Device = 'mobile' | 'tablet' | 'desktop' | 'other';

/** Coarse device class from the user agent (stored instead of the UA itself). */
export function deviceFromUA(ua: string | null | undefined): Device {
  const s = (ua ?? '').toLowerCase();
  if (!s) return 'other';
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))|kindle/.test(s)) return 'tablet';
  if (/mobi|iphone|ipod|android|blackberry|opera mini|iemobile|windows phone/.test(s)) return 'mobile';
  if (/windows|macintosh|linux|cros|x11/.test(s)) return 'desktop';
  return 'other';
}
