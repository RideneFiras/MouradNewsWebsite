import { getRequestConfig } from 'next-intl/server';
import { routing, isLocale } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = isLocale(requested) ? requested : routing.defaultLocale;
  const messages = locale === 'fr' ? (await import('@/messages/fr.json')).default : (await import('@/messages/ar.json')).default;
  return { locale, messages, timeZone: 'Africa/Tunis' };
});
