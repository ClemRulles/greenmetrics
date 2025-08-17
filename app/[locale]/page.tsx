import type { Metadata } from 'next';
import { getDict } from '@/i18n';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import React from 'react';
import type { Locale } from '@/i18n';
import HeroClient from '@/components/landing/HeroClient';
import SectionHeaderClient from '@/components/ui/SectionHeaderClient';
import SimulatorClient from '@/components/landing/SimulatorClient';

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

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = localeParam as Locale;
  const t = await getDict(locale, 'common');
  const landing = (await getDict(locale, 'common'))?.landing || {};

  return (
    <main className="space-y-8">
      <a href="#main-content" className="sr-only focus:not-sr-only p-2">{t.ui?.skipToContent}</a>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">{t.navigation.home}</h2>
        <LocaleSwitcher currentLocale={locale} />
      </div>

    {/* Hero */}
  <HeroClient title={landing.headline} subtitle={landing.sub} primaryCta={landing.primaryCta} secondaryCta={landing.secondaryCta} />

      {/* Value sections */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="font-semibold text-[var(--text-default)] mb-2">{landing.privacy}</h3>
          <p className="text-sm text-[var(--text-muted)]">Evidence-backed numbers and privacy-first sharing.</p>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="font-semibold text-[var(--text-default)] mb-2">{landing.traceability}</h3>
          <p className="text-sm text-[var(--text-muted)]">Traceable factors and invoice evidence for audits.</p>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="font-semibold text-[var(--text-default)] mb-2">{landing.speed}</h3>
          <p className="text-sm text-[var(--text-muted)]">Get a universal certificate in 48 hours.</p>
        </div>
      </section>

      {/* Mini simulator */}
      <section id="main-content" className="bg-white rounded-lg p-6 shadow-sm">
  <SectionHeaderClient title="Mini simulator" subtitle="Intensity × units = attributed tCO₂e" />
  <SimulatorClient />
      </section>
    </main>
  );
}

// ...existing code removed; using components/landing/Simulator instead

