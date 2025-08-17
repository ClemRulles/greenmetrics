import { buildReportPayload } from './buildReportPayload';

type Engine = 'mock' | 'react-pdf';

function getEngine(): Engine {
  const v = (process.env.PDF_ENGINE || 'mock').toLowerCase();
  return v === 'react-pdf' ? 'react-pdf' : 'mock';
}

export async function renderReportPdfBuffer(reportId: string) {
  const data = await buildReportPayload(reportId);
  const engine = getEngine();

  if (engine === 'react-pdf') {
    try {
      // Dynamic import to avoid bundling issues during build
      const mod = await import('@react-pdf/renderer');
      const { renderToBuffer } = mod;
      const ReportDoc = (await import('./ReportDoc')).default;
      const React = (await import('react'));
      
      // Use type assertions to avoid React-PDF type compatibility issues
      const doc = React.createElement(ReportDoc, { data });
      // @ts-expect-error: React-PDF type compatibility issue with Next.js 15
      const buf = await renderToBuffer(doc);
      return { buffer: buf, data, engine: 'react-pdf' as const };
    } catch (err) {
      console.warn('[PDF] React-PDF failed, falling back to mock:', err);
      // fall through to mock
    }
  }

  // Mock engine: simple placeholder PDF bytes (valid enough for tests/download)
  const mock = Buffer.from('%PDF-1.3\n% Mock PDF\n');
  return { buffer: mock, data, engine: 'mock' as const };
}
