import type { Metadata } from 'next';
import { getDict } from '@/i18n';
import type { Locale } from '@/i18n';
import { DashboardClient } from './DashboardClient';

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string }> }
): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;
  const t = await getDict(locale, 'common');
  return { 
    title: t.auth?.dashboard || 'Dashboard',
    description: 'Partner dashboard for ESG reporting and carbon tracking'
  };
}

export default async function AppHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;
  const t = await getDict(locale, 'common');

  return (
    <DashboardClient 
      locale={locale}
      translations={{
        dashboard: t.auth.dashboard,
        signedInHint: t.auth.signedInHint,
        signOut: t.auth.signOut
      }}
    />
  );
}
