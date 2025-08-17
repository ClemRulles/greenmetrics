import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatBar } from '@/app/[locale]/app/billing/components/StatBar';

describe('StatBar Component', () => {
  it('renders usage statistics correctly', () => {
    render(
      <StatBar 
        label="Reports / month" 
        used={15} 
        max={50} 
      />
    );

    expect(screen.getByText('Reports / month')).toBeDefined();
    expect(screen.getByText('15 / 50')).toBeDefined();
    expect(screen.getByText('30% used')).toBeDefined();
  });

  it('handles full usage correctly', () => {
    render(
      <StatBar 
        label="Storage (GB)" 
        used={100} 
        max={100} 
      />
    );

    expect(screen.getByText('Storage (GB)')).toBeDefined();
    expect(screen.getByText('100 / 100')).toBeDefined();
    expect(screen.getByText('100% used')).toBeDefined();
  });

  it('handles over-limit usage', () => {
    render(
      <StatBar 
        label="API calls / day" 
        used={150} 
        max={100} 
      />
    );

    expect(screen.getByText('API calls / day')).toBeDefined();
    expect(screen.getByText('150 / 100')).toBeDefined();
    expect(screen.getByText('100% used')).toBeDefined(); // Capped at 100%
  });

  it('includes proper accessibility attributes', () => {
    render(
      <StatBar 
        label="Exports / hour" 
        used={3} 
        max={5} 
      />
    );

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar.getAttribute('aria-valuenow')).toBe('60');
    expect(progressBar.getAttribute('aria-valuemin')).toBe('0');
    expect(progressBar.getAttribute('aria-valuemax')).toBe('100');
    expect(progressBar.getAttribute('aria-label')).toBe('Exports / hour: 3 of 5 used');
  });
});
