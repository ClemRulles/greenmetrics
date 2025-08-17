import type { Metadata } from 'next';
import { getDict } from '@/i18n';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import React from 'react';
import type { Locale } from '@/i18n';
import LandingClient from '@/components/landing/LandingClient';

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string }> }
): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;
  const t = await getDict(locale, 'common');
  return {
    title: t.navigation?.home || 'Home',
    description: t.common?.tagline || 'ESG carbon reporting platform',
    openGraph: {
      title: t.navigation?.home || 'Home',
      description: t.common?.tagline || 'ESG carbon reporting platform',
      url: `https://localhost:3000/${locale}`,
    }
  };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;
  const t = await getDict(locale, 'common');
  const landing = t.landing || {};

  return (
    <main id="main-content">
      <LandingClient landing={landing} />
    </main>
  );
}

// ...existing code removed; using components/landing/Simulator instead

