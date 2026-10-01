import { getRequestConfig } from 'next-intl/server';
import { routing, isLocale } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = isLocale(requested) ? requested : routing.defaultLocale;
  const [pub, admin] =
    locale === 'fr'
      ? await Promise.all([import('@/messages/fr.json'), import('@/messages/admin.fr.json')])
      : await Promise.all([import('@/messages/ar.json'), import('@/messages/admin.ar.json')]);
  return { locale, messages: { ...pub.default, admin: admin.default }, timeZone: 'Africa/Tunis' };
});
