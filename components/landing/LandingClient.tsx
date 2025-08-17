"use client";

import React from 'react';
import HeroClient from '@/components/landing/HeroClient';
import SectionHeader from '@/components/ui/SectionHeader';
import Simulator from '@/components/landing/Simulator';

type Props = {
  landing: any;
};

export default function LandingClient({ landing }: Props) {
  return (
    <>
      <HeroClient title={landing.headline} subtitle={landing.sub} primaryCta={landing.primaryCta} secondaryCta={landing.secondaryCta} />

      <section id="main-content" className="bg-white rounded-lg p-6 shadow-sm">
        <SectionHeader title="Mini simulator" subtitle="Intensity × units = attributed tCO₂e" />
        <Simulator />
      </section>
    </>
  );
}
