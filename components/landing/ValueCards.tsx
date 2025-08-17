"use client";

import React from 'react';

type Item = { title: string; desc: string };

export default function ValueCards({ items = [] }: { items?: Item[] }) {
  return (
    <section aria-labelledby="value-cards" className="py-8">
      <div className="mx-auto max-w-5xl px-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {items.length ? items.map((it, idx) => (
          <article key={idx} className="bg-white rounded-xl p-6 shadow-sm" aria-labelledby={`vc-${idx}-title`}>
            <h3 id={`vc-${idx}-title`} className="text-lg font-semibold text-neutral-900 mb-2">{it.title}</h3>
            <p className="text-sm text-neutral-600">{it.desc}</p>
          </article>
        )) : (
          <>
            <article className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">Confidential by default</h3>
              <p className="text-sm text-neutral-600">We never expose supplier invoices — data stays private and auditable.</p>
            </article>
            <article className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">Traceable</h3>
              <p className="text-sm text-neutral-600">All certificates are backed by invoice evidence and traceable factors.</p>
            </article>
            <article className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">48h Certificates</h3>
              <p className="text-sm text-neutral-600">Fast issuance for procurement teams and auditors.</p>
            </article>
          </>
        )}
      </div>
    </section>
  );
}
