import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

// Mock matchMedia
const createMockMatchMedia = (matches: boolean) => {
  return vi.fn().mockImplementation((query) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

describe('useReducedMotion', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.clearAllMocks();
  });

  it('returns false when prefers-reduced-motion is not set', () => {
    window.matchMedia = createMockMatchMedia(false);
    
    const { result } = renderHook(() => useReducedMotion());
    
    expect(result.current).toBe(false);
  });

  it('returns true when prefers-reduced-motion is reduce', () => {
    window.matchMedia = createMockMatchMedia(true);
    
    const { result } = renderHook(() => useReducedMotion());
    
    expect(result.current).toBe(true);
  });

  it('sets up event listener for media query changes', () => {
    const mockAddEventListener = vi.fn();
    const mockRemoveEventListener = vi.fn();
    
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    }));

    const { unmount } = renderHook(() => useReducedMotion());
    
    expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    
    unmount();
    
    expect(mockRemoveEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
