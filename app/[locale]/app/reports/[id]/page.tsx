'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import en from '@/public/locales/en/common.json';
import fr from '@/public/locales/fr/common.json';

type ComputeResult = {
  totals: { scope1Kg: number; scope2Kg: number; totalKg: number };
  traceCount: number;
  geography?: string;
  factorsVersion?: string;
  snapshotted?: boolean;
};

export default function ReportTotalsPage() {
  const { id, locale } = useParams() as { id: string; locale: 'en'|'fr' };
  const dict = locale === 'fr' ? fr : en;
  const t = dict.export;

  const [result, setResult] = useState<ComputeResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function compute() {
    setBusy(true);
    try {
      const res = await fetch(`/api/reports/${id}/compute`, { method: 'POST' });
      const json = await res.json();
      setResult(json.data);
    } catch (error) {
      console.error('Compute failed:', error);
    } finally {
      setBusy(false);
    }
  }

  function download() {
    window.location.href = `/api/reports/${id}/export/pdf`;
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Report Totals</h1>
      <div className="flex gap-3">
        <button className="rounded bg-blue-600 px-3 py-2 text-white" onClick={compute} disabled={busy}>
          {busy ? '…' : t.compute}
        </button>
        <button className="rounded bg-gray-800 px-3 py-2 text-white" onClick={download}>
          {t.downloadPdf}
        </button>
      </div>
      {result && (
        <div className="space-y-2">
          <pre className="rounded border bg-gray-50 p-3 text-sm">
{JSON.stringify(result, null, 2)}
          </pre>
          {result?.factorsVersion && (
            <p className="text-sm text-gray-600">Factors: {result.factorsVersion}</p>
          )}
        </div>
      )}
    </main>
  );
}
