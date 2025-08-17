"use client";

import React from 'react'
import Link from 'next/link'
import ReducedMotionGate from '@/components/motion/ReducedMotionGate'

type Props = {
  title: string
  subtitle: string
  primaryCta: string
  secondaryCta: string
}

export default function Hero({ title, subtitle, primaryCta, secondaryCta }: Props) {
  return (
    <section aria-labelledby="landing-hero" className="bg-white rounded-2xl p-8 shadow-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        <div>
          <h1 id="landing-hero" className="text-4xl font-extrabold text-[var(--text-default)] mb-3">{title}</h1>
          <p className="text-lg text-[var(--text-muted)] mb-6">{subtitle}</p>
          <div className="flex items-center gap-3">
            <Link href="#" className="px-4 py-2 rounded-md bg-[var(--brand-blue)] text-white font-medium" aria-label={primaryCta}>{primaryCta}</Link>
            <Link href="#" className="px-4 py-2 rounded-md border border-[var(--brand-blue)] text-[var(--brand-blue)]" aria-label={secondaryCta}>{secondaryCta}</Link>
          </div>
        </div>

        <div>
          <ReducedMotionGate>
            <div className="rounded-xl p-4 bg-gradient-to-br from-[var(--brand-blue-50)] to-[var(--brand-green-50)]">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">Sample KPI</p>
                    <p className="text-2xl font-bold">2,847 tCO₂e</p>
                  </div>
                  <div className="w-28 h-10 bg-neutral-100 rounded" aria-hidden="true" />
                </div>
              </div>
            </div>
          </ReducedMotionGate>
        </div>
      </div>
    </section>
  )
}
