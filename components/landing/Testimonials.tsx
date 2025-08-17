"use client";

import React from 'react';

type Quote = { quote: string; author: string; role?: string };

export default function Testimonials({ quotes = [] }: { quotes?: Quote[] }) {
  const items = quotes.length ? quotes : [
    { quote: 'GreenMetrics reduced our supplier reporting burden by 80%', author: 'Jane Doe', role: 'Head of Procurement' },
    { quote: 'Fast, private, and audit-ready certificates — highly recommended.', author: 'John Smith', role: 'Sustainability Manager' }
  ];

  return (
    <section aria-labelledby="testimonials" className="py-12">
      <div className="mx-auto max-w-5xl px-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {items.map((q, i) => (
          <blockquote key={i} className="bg-white rounded-xl p-6 shadow-sm">
            <p className="text-neutral-800 italic">“{q.quote}”</p>
            <footer className="mt-4 text-sm text-neutral-600">— {q.author}{q.role ? `, ${q.role}` : ''}</footer>
          </blockquote>
        ))}
      </div>
    </section>
  );
}
