"use client";

import React from 'react';

export default function LogosStrip() {
  // try to use public/logos if present else fallback to text
  const logos = ['Acme', 'Globex', 'Umbrella', 'Initech'];

  return (
    <section aria-label="Partners" className="py-8 bg-white">
      <div className="mx-auto max-w-5xl px-6">
        <div className="flex items-center justify-center gap-8 flex-wrap grayscale opacity-80">
          {logos.map((label, i) => (
            <div key={i} className="w-32 h-12 flex items-center justify-center" aria-hidden>
              <div className="text-sm text-neutral-600 font-medium">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
