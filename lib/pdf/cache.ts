import { prisma } from '@/lib/prisma';
import { storage } from '@/lib/storage';
import { renderReportPdfBuffer } from './render';
import crypto from 'crypto';

async function contentHash(reportId: string, engine: string) {
  const report = await prisma.report.findUnique({ 
    where: { id: reportId }, 
    include: { 
      activities: { 
        select: { updatedAt: true }, 
        orderBy: { updatedAt: 'desc' }, 
        take: 1 
      } 
    } 
  });
  if (!report) throw new Error('REPORT_NOT_FOUND');

  const latestActivity = report.activities[0]?.updatedAt?.toISOString() || '';
  const lastTrace = await prisma.computationTrace.findFirst({ 
    where: { reportId }, 
    orderBy: { createdAt: 'desc' } 
  });

  // include framework versions, factorsVersion, language
  const base = JSON.stringify({
    reportId,
    framework: report.framework,
    frameworkVersion: report.frameworkVersion,
    language: report.language,
    // factorsVersion from latest trace if any
    factorsVersion: lastTrace?.factorVersion || 'unknown',
    reportUpdatedAt: report.updatedAt.toISOString(),
    latestActivity,
    engine
  });

  return crypto.createHash('sha256').update(base).digest('hex');
}

export async function getOrCreateCachedPdf(reportId: string) {
  const engine = (process.env.PDF_ENGINE || 'mock').toLowerCase();
  const hash = await contentHash(reportId, engine);

  let asset = await prisma.exportAsset.findUnique({ where: { hash } });
  if (asset) return { asset, created: false };

  // render fresh
  const { buffer, data } = await renderReportPdfBuffer(reportId);

  // storage key convention
  const key = `${reportId}/${hash}.pdf`;
  const drv = storage();
  await drv.put(key, buffer, 'application/pdf');

  asset = await prisma.exportAsset.create({
    data: {
      reportId,
      hash,
      storageDriver: (process.env.STORAGE_DRIVER || 'local'),
      storageKey: key,
      contentType: 'application/pdf',
      bytes: buffer.byteLength,
      framework: data.report.framework,
      frameworkVersion: data.report.frameworkVersion,
      factorsVersion: data.factorsVersion,
      language: data.report.language,
      engine: engine
    }
  });

  await prisma.exportJob.create({ 
    data: { 
      reportId, 
      status: 'READY', 
      reason: 'user-request' 
    } 
  });

  return { asset, created: true };
}
