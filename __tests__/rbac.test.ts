import { hasAnyRole, requireAuth } from '@/lib/rbac';

describe('RBAC', () => {
  it('hasAnyRole returns false without session', () => {
    expect(hasAnyRole(null, ['OWNER'] as any)).toBe(false);
  });
  it('requireAuth throws for missing session', () => {
    expect(() => requireAuth(null as any)).toThrow();
  });
});
