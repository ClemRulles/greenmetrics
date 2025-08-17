import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { locales, type Locale } from '@/i18n';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AuthProvider } from '@/components/AuthProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { AppHeader } from '@/components/layout/AppHeader';
import { Announcer } from '@/components/feedback/Announcer';
import { inter, mono } from '@/app/(design)/fonts';
import en from '@/public/locales/en/common.json';
import fr from '@/public/locales/fr/common.json';

export default async function LocaleLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const nonce = (await headers()).get('x-csp-nonce') ?? '';

  const { locale: localeParam } = await params;
  const locale = (locales as readonly string[]).includes(localeParam) ? (localeParam as Locale) : 'en';
  const session = await getServerSession(authOptions);
  
  // Simple i18n helper for common UI strings
  const dict = locale === 'fr' ? fr : en;
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: unknown = dict;
    for (const k of keys) {
      if (typeof value === 'object' && value !== null && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key;
      }
    }
    return typeof value === 'string' ? value : key;
  };
  
  return (
    <html lang={locale} className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* Expose nonce to client via meta for potential client-side libraries */}
        <meta name="csp-nonce" content={nonce} />
        {/* Preconnect to critical origins (only when services are enabled) */}
        {process.env.NEXT_PUBLIC_SENTRY_DSN && (
          <link rel="preconnect" href="https://o0.ingest.sentry.io" crossOrigin="" />
        )}
        {process.env.NEXT_PUBLIC_POSTHOG_HOST && (
          <link rel="preconnect" href={process.env.NEXT_PUBLIC_POSTHOG_HOST} crossOrigin="" />
        )}
        {/* DNS prefetch for potential external resources */}
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
      </head>
      <body className="min-h-screen antialiased bg-surface-soft text-slate-900 dark:text-slate-100 font-sans">
        <ThemeProvider>
          <AuthProvider session={session}>
            <Announcer />
            <AppHeader 
              locale={locale} 
              translations={{
                skipToContent: t('skipToContent'),
                themeToggle: t('themeToggle')
              }}
            />
            <main id="main-content" className="mx-auto max-w-6xl px-4 py-6">
              {children}
            </main>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
