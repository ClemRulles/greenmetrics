'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { locales, type Locale } from '@/i18n';
import en from '@/public/locales/en/wizard.json';
import fr from '@/public/locales/fr/wizard.json';

const dict = { en, fr } as const;

type Item = { kind: 'ELECTRICITY_KWH'|'FUEL_L'|'WASTE_TONNES'|'TRAVEL_KM'; unit: string; value: number; note?: string };

export default function NewReportWizard() {
  const router = useRouter();
  const params = useParams<{ locale: Locale }>();
  const locale = locales.includes(params.locale) ? params.locale : 'en';
  const t = dict[locale].wizard;

  const [step, setStep] = useState<1|2|3>(1);
  const [orgId, setOrgId] = useState('');
  const [name, setName] = useState('');
  const [periodStart, setStart] = useState('');
  const [periodEnd, setEnd] = useState('');

  const [items, setItems] = useState<Item[]>([]);

  async function createReport() {
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: orgId,
        name,
        periodStart,
        periodEnd,
        framework: 'VSME-Basic',
        frameworkVersion: 'VSME 2025.07',
        language: locale
      })
    });
    if (!res.ok) throw new Error('create report failed');
    const { data } = await res.json();
    return data.id as string;
  }

  async function saveActivities(reportId: string) {
    const res = await fetch(`/api/reports/${reportId}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });
    if (!res.ok) throw new Error('save activities failed');
  }

  async function next() {
    if (step === 1) setStep(2);
    else if (step === 2) setStep(3);
    else {
      const reportId = await createReport();
      await saveActivities(reportId);
      router.push(`/${locale}/app`); // later: go to report detail
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">{t.title}</h1>

      {step === 1 && (
        <section className="space-y-3">
          <h2 className="text-xl">{t.step1}</h2>
          <input className="w-full rounded border p-2" placeholder="Organization ID" value={orgId} onChange={(e) => setOrgId(e.target.value)} />
          <input className="w-full rounded border p-2" placeholder="Report name" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="flex gap-2">
            <input type="date" className="rounded border p-2" value={periodStart} onChange={(e) => setStart(e.target.value)} />
            <input type="date" className="rounded border p-2" value={periodEnd} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-3">
          <h2 className="text-xl">{t.step2}</h2>
          <button
            className="rounded border px-3 py-1"
            onClick={() => setItems((arr) => [...arr, { kind: 'ELECTRICITY_KWH', unit: 'kWh', value: 0 }])}
          >
            + {t.electricity}
          </button>
          <ul className="space-y-2">
            {items.map((it, i) => (
              <li key={i} className="flex gap-2">
                <select
                  className="rounded border p-2"
                  value={it.kind}
                  onChange={(e) => {
                    const k = e.target.value as Item['kind'];
                    setItems((arr) => arr.map((x, idx) => (idx === i ? { ...x, kind: k } : x)));
                  }}
                >
                  <option value="ELECTRICITY_KWH">{t.electricity}</option>
                  <option value="FUEL_L">{t.fuel}</option>
                  <option value="WASTE_TONNES">{t.waste}</option>
                  <option value="TRAVEL_KM">{t.travel}</option>
                </select>
                <input
                  className="w-28 rounded border p-2"
                  placeholder="Unit"
                  value={it.unit}
                  onChange={(e) => setItems((arr) => arr.map((x, idx) => (idx === i ? { ...x, unit: e.target.value } : x)))}
                />
                <input
                  type="number"
                  className="w-40 rounded border p-2"
                  placeholder="Value"
                  value={it.value}
                  onChange={(e) => setItems((arr) => arr.map((x, idx) => (idx === i ? { ...x, value: Number(e.target.value) } : x)))}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-3">
          <h2 className="text-xl">{t.step3}</h2>
          <pre className="rounded border bg-gray-50 p-3 text-sm">{JSON.stringify({ orgId, name, periodStart, periodEnd, items }, null, 2)}</pre>
        </section>
      )}

      <div className="flex justify-end">
        <button className="rounded bg-blue-600 px-4 py-2 text-white" onClick={next}>
          {step < 3 ? 'Next' : 'Save'}
        </button>
      </div>
    </main>
  );
}
