import { describe, it, expect, vi } from 'vitest';
import * as Sign from '@/lib/pdf/sign';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    exportAsset: { 
      findUnique: vi.fn(async () => ({ 
        id: 'a1', 
        storageKey: 'r/hash.pdf', 
        contentType: 'application/pdf', 
        reportId: 'r', 
        bytes: 3 
      })) 
    },
  }
}));

vi.mock('@/lib/storage', () => ({ 
  storage: () => ({ 
    get: vi.fn(async () => Buffer.from('pdf')) 
  }) 
}));

import { GET } from '@/app/api/exports/[assetId]/download/route';

describe('signed download', () => {
  it('accepts valid signature', async () => {
    const { exp, sig } = Sign.makeSignedUrlParams('a1', 3600);
    const res = await GET(new Request(`http://x?exp=${exp}&sig=${sig}`), { params: { assetId: 'a1' } });
    expect(res.headers.get('content-type')).toMatch(/application\/pdf/);
  });

  it('rejects invalid signature', async () => {
    const res = await GET(new Request('http://x?exp=1&sig=bad'), { params: { assetId: 'a1' } });
    expect(res.status).toBe(403);
  });
});
