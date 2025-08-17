import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EntitlementGuard } from '@/components/EntitlementGuard';

// Mock Banner component
const MockBanner = ({ status, until }: { status: 'ok'|'grace'|'frozen'; until?: string|null }) => (
  <div data-testid="banner" data-status={status} data-until={until}>
    {status === 'grace' && `Grace period until ${until}`}
    {status === 'frozen' && 'Account frozen'}
  </div>
);

describe('EntitlementGuard Component', () => {
  it('renders children normally when status is ok', () => {
    const entitlements = {
      plan: 'BASIC' as const,
      isFrozen: false,
      graceUntil: null
    };

    render(
      <EntitlementGuard 
        entitlements={entitlements} 
        BannerComponent={MockBanner}
      >
        <div>Protected content</div>
      </EntitlementGuard>
    );

    expect(screen.getByText('Protected content')).toBeDefined();
    expect(screen.queryByTestId('banner')).toBeNull();
  });

  it('shows banner and content during grace period', () => {
    const entitlements = {
      plan: 'BASIC' as const,
      isFrozen: false,
      graceUntil: '2025-08-22T10:00:00Z'
    };

    render(
      <EntitlementGuard 
        entitlements={entitlements} 
        BannerComponent={MockBanner}
      >
        <div>Protected content</div>
      </EntitlementGuard>
    );

    expect(screen.getByText('Protected content')).toBeDefined();
    const banner = screen.getByTestId('banner');
    expect(banner).toBeDefined();
    expect(banner.getAttribute('data-status')).toBe('grace');
    expect(banner.getAttribute('data-until')).toBe('2025-08-22T10:00:00Z');
  });

  it('shows banner and hides content when frozen', () => {
    const entitlements = {
      plan: 'BASIC' as const,
      isFrozen: true,
      graceUntil: null
    };

    render(
      <EntitlementGuard 
        entitlements={entitlements} 
        BannerComponent={MockBanner}
      >
        <div>Protected content</div>
      </EntitlementGuard>
    );

    expect(screen.queryByText('Protected content')).toBeNull();
    const banner = screen.getByTestId('banner');
    expect(banner).toBeDefined();
    expect(banner.getAttribute('data-status')).toBe('frozen');
  });

  it('prioritizes frozen state over grace period', () => {
    const entitlements = {
      plan: 'BASIC' as const,
      isFrozen: true,
      graceUntil: '2025-08-22T10:00:00Z'
    };

    render(
      <EntitlementGuard 
        entitlements={entitlements} 
        BannerComponent={MockBanner}
      >
        <div>Protected content</div>
      </EntitlementGuard>
    );

    expect(screen.queryByText('Protected content')).toBeNull();
    const banner = screen.getByTestId('banner');
    expect(banner.getAttribute('data-status')).toBe('frozen');
  });
});
