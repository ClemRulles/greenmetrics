import { describe, it, expect, vi } from 'vitest';

const mockDb: { asset?: any } = { asset: undefined };

vi.mock('@/lib/prisma', () => ({
  prisma: {
    report: { 
      findUnique: vi.fn(async () => ({ 
        id: 'r', 
        framework: 'VSME-Basic', 
        frameworkVersion: 'VSME 2025.07', 
        language: 'en', 
        updatedAt: new Date(), 
        activities: [] 
      })) 
    },
    computationTrace: { 
      findFirst: vi.fn(async () => ({ factorVersion: 'v2024.1' })) 
    },
    exportAsset: {
      findUnique: vi.fn(async () => mockDb.asset),
      create: vi.fn(async (args: any) => (mockDb.asset = { id: 'a1', ...args.data })),
    },
    exportJob: { 
      create: vi.fn(async () => {}) 
    },
  }
}));

vi.mock('@/lib/storage', () => ({ 
  storage: () => ({ 
    put: vi.fn(async () => {}), 
    get: vi.fn(async () => Buffer.from('pdf')), 
    exists: vi.fn(async () => true) 
  }) 
}));

vi.mock('@/lib/pdf/render', () => ({ 
  renderReportPdfBuffer: vi.fn(async () => ({ 
    buffer: Buffer.from('pdf'), 
    data: { 
      report: { 
        framework: 'VSME-Basic', 
        frameworkVersion: 'VSME 2025.07', 
        language: 'en' 
      }, 
      factorsVersion: 'v2024.1' 
    } 
  })) 
}));

import { getOrCreateCachedPdf } from '@/lib/pdf/cache';

describe('export cache', () => {
  it('creates asset on first call, reuses on second', async () => {
    mockDb.asset = undefined; // reset
    const a1 = await getOrCreateCachedPdf('r');
    const a2 = await getOrCreateCachedPdf('r');
    expect(a1.asset.id).toBe('a1');
    expect(a2.asset.id).toBe('a1');
    expect(a1.created).toBe(true);
    expect(a2.created).toBe(false);
  });
});
