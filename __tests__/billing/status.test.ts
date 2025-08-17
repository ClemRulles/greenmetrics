import { deriveStatus } from '@/lib/billing/ui';
import { describe, it, expect } from 'vitest';

describe('deriveStatus', () => {
  it('frozen wins', () => expect(deriveStatus(true, null)).toBe('frozen'));
  it('grace if graceUntil present', () => expect(deriveStatus(false, '2025-01-01')).toBe('grace'));
  it('ok otherwise', () => expect(deriveStatus(false, null)).toBe('ok'));
});
