import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { reportWebVitals, type WebVitalMetric } from '../../lib/perf/reportWebVitals';

// Mock navigator.sendBeacon
const mockSendBeacon = vi.fn();
const mockFetch = vi.fn();

Object.defineProperty(global, 'navigator', {
  value: { sendBeacon: mockSendBeacon },
  writable: true,
});

Object.defineProperty(global, 'fetch', {
  value: mockFetch,
  writable: true,
});

// Mock document.cookie
Object.defineProperty(document, 'cookie', {
  writable: true,
  value: '',
});

describe('reportWebVitals', () => {
  const mockMetric: WebVitalMetric = {
    id: 'test-metric-id',
    name: 'LCP',
    value: 1234.5,
    label: 'web-vital',
    rating: 'good',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { pathname: '/en/test' },
      writable: true,
    });
  });

  afterEach(() => {
    document.cookie = '';
  });

  it('does not report when consent is not given', () => {
    document.cookie = 'other=value';
    
    reportWebVitals(mockMetric);
    
    expect(mockSendBeacon).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('reports metrics when consent is given', () => {
    document.cookie = 'consent=accepted; other=value';
    
    reportWebVitals(mockMetric);
    
    expect(mockSendBeacon).toHaveBeenCalledWith(
      '/api/rum',
      expect.stringContaining('"name":"LCP"')
    );
    
    const sentData = JSON.parse(mockSendBeacon.mock.calls[0][1]);
    expect(sentData).toMatchObject({
      id: 'test-metric-id',
      name: 'LCP',
      value: 1234.5,
      label: 'web-vital',
      route: '/en/test',
    });
    expect(sentData.timestamp).toBeTypeOf('number');
  });

  it('falls back to fetch when sendBeacon is not available', () => {
    document.cookie = 'consent=accepted';
    // Remove sendBeacon
    navigator.sendBeacon = undefined as any;
    mockFetch.mockResolvedValue({ ok: true });
    
    reportWebVitals(mockMetric);
    
    expect(mockFetch).toHaveBeenCalledWith('/api/rum', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('"name":"LCP"'),
      keepalive: true,
    });
  });

  it('handles errors silently', () => {
    document.cookie = 'consent=accepted';
    mockSendBeacon.mockImplementation(() => {
      throw new Error('Network error');
    });
    
    // Should not throw
    expect(() => reportWebVitals(mockMetric)).not.toThrow();
  });

  it('includes current route in reported data', () => {
    document.cookie = 'consent=accepted';
    window.location.pathname = '/fr/reports/123';
    
    reportWebVitals(mockMetric);
    
    const sentData = JSON.parse(mockSendBeacon.mock.calls[0][1]);
    expect(sentData.route).toBe('/fr/reports/123');
  });
});
