import resourcesToBackend from 'i18next-resources-to-backend';
import { createInstance } from 'i18next';

export const locales = ['en', 'fr'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export const namespaces = ['common', 'wizard', 'errors', 'emissions', 'sponsor', 'partner', 'sharing'] as const;
export type Namespace = (typeof namespaces)[number];

export async function getDict(locale: Locale, ns: Namespace = 'common') {
  // Map partner namespace to partenaire for French locale
  const actualNs = locale === 'fr' && ns === 'partner' ? 'partenaire' : ns;
  
  // dynamic import of JSON from public/locales
  const i18n = createInstance();
  // This only loads the namespace we need (keeps it light for server components)
  await i18n
    .use(
      resourcesToBackend((language: string, namespace: string) =>
        import(`@/public/locales/${language}/${namespace}.json`)
      )
    )
    .init({
      lng: locale,
      fallbackLng: defaultLocale,
      supportedLngs: locales as unknown as string[],
      defaultNS: 'common',
      ns: actualNs
    });

  // return a typed "dictionary" object so we can do t.common.xyz in server components
  const dict = await import(`@/public/locales/${locale}/${actualNs}.json`);
  return dict.default as any;
}
