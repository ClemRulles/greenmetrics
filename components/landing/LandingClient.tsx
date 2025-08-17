
"use client";

import React from 'react';
import HeroClient from './HeroClient';
import SimulatorClient from './SimulatorClient';
import SectionHeaderClient from '@/components/ui/SectionHeaderClient';
import ValueCards from './ValueCards';
import LogosStrip from './LogosStrip';
import Testimonials from './Testimonials';

type Landing = Record<string, any>;

export default function LandingClient({ landing = {} as Landing }) {
	return (
		<>
			<HeroClient title={landing.hero?.title} subtitle={landing.hero?.subtitle} primaryCta={landing.hero?.ctaPrimary} secondaryCta={landing.hero?.ctaSecondary} />

			<SectionHeaderClient title={landing.value?.title} subtitle={landing.value?.subtitle} />
			<ValueCards items={landing.value?.items || []} />

			<SectionHeaderClient title={landing.sim?.title} subtitle={landing.sim?.subtitle} />
			<SimulatorClient />

			<LogosStrip />
			<Testimonials quotes={landing.testimonials || []} />

			<section className="py-16">
				<div className="mx-auto max-w-5xl px-6 text-center">
					<a className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-300" href="/en/app/partner">
						{landing.cta?.demo || 'Request demo'}
					</a>
				</div>
			</section>
		</>
	);
}

