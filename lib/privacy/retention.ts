import { prisma } from '@/lib/prisma';

const days = (n: number) => n * 24 * 60 * 60 * 1000;

export async function runRetentionSweep() {
  const assetDays = Number(process.env.RETENTION_EXPORT_ASSETS_DAYS || 365);
  const jobDays = Number(process.env.RETENTION_JOBS_DAYS || 90);
  const beforeAssets = new Date(Date.now() - days(assetDays));
  const beforeJobs = new Date(Date.now() - days(jobDays));

  const deletedAssets = await prisma.exportAsset.deleteMany({
    where: { createdAt: { lt: beforeAssets } }
  });
  const deletedJobs = await prisma.exportJob.deleteMany({
    where: { createdAt: { lt: beforeJobs } }
  });

  return { deletedAssets: deletedAssets.count, deletedJobs: deletedJobs.count };
}
