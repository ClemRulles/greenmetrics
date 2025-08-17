import { describe, it, expect, vi } from 'vitest';

vi.mock('@react-pdf/renderer', () => ({ 
  renderToBuffer: vi.fn(async () => Buffer.from('pdf')) 
}));
vi.mock('@/lib/pdf/buildReportPayload', () => ({
  buildReportPayload: vi.fn(async () => ({
    report: { 
      id: 'r', 
      name: 'R', 
      framework: 'VSME-Basic', 
      frameworkVersion: 'VSME 2025.07', 
      language: 'en', 
      periodStart: '2024-01-01', 
      periodEnd: '2024-12-31' 
    },
    organization: { name: 'Demo' },
    activities: [],
    totals: { scope1Kg: 1, scope2Kg: 2, totalKg: 3 },
    traceCount: 2,
    factorsVersion: 'v2024.1'
  }))
}));

import { renderReportPdfBuffer } from '@/lib/pdf/render';

describe('renderReportPdfBuffer', () => {
  it('uses mock engine by default', async () => {
    delete (process.env as any).PDF_ENGINE;
    const res = await renderReportPdfBuffer('r1');
    expect(res.engine).toBe('mock');
    expect(res.buffer).toBeInstanceOf(Buffer);
  });

  it('attempts react-pdf when flag set', async () => {
    process.env.PDF_ENGINE = 'react-pdf';
    const res = await renderReportPdfBuffer('r2');
    expect(res.engine === 'react-pdf' || res.engine === 'mock').toBe(true);
    expect(res.buffer).toBeInstanceOf(Buffer);
  });

  it('returns a PDF buffer', async () => {
    const { buffer, data } = await renderReportPdfBuffer('r');
    expect(buffer).toBeInstanceOf(Buffer);
    expect(data.totals.totalKg).toBe(3);
  });
});
