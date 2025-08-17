
"use client";

import React from 'react';
import HeroClient from './HeroClient';
import SimulatorClient from './SimulatorClient';
import SectionHeaderClient from '@/components/ui/SectionHeaderClient';

type Props = {
	landing?: any;
};

export default function LandingClient({ landing = {} }: Props) {
	return (
		<main className="space-y-8">
			<HeroClient title={landing.headline} subtitle={landing.sub} primaryCta={landing.primaryCta} secondaryCta={landing.secondaryCta} />

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

			<section id="main-content" className="bg-white rounded-lg p-6 shadow-sm">
				<SectionHeaderClient title="Mini simulator" subtitle="Intensity × units = attributed tCO₂e" />
				<SimulatorClient />
			</section>
		</main>
	);
}

