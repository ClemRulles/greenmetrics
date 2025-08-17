import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { SkipLink } from '../../components/a11y/SkipLink';

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href, className, ...props }: any) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}));

describe('SkipLink', () => {
  it('renders with correct href', () => {
    render(<SkipLink label="Skip to content" />);
    
    const link = screen.getByRole('link', { name: /skip to content/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '#main-content');
  });

  it('renders with custom href', () => {
    render(<SkipLink label="Skip to main" href="#custom-main" />);
    
    const link = screen.getByRole('link', { name: /skip to main/i });
    expect(link).toHaveAttribute('href', '#custom-main');
  });

  it('applies sr-only class for accessibility', () => {
    render(<SkipLink label="Skip to content" />);
    
    const link = screen.getByRole('link', { name: /skip to content/i });
    expect(link).toHaveClass('sr-only');
  });

  it('includes focus styles in className', () => {
    render(<SkipLink label="Skip to content" />);
    
    const link = screen.getByRole('link', { name: /skip to content/i });
    expect(link.className).toMatch(/focus:not-sr-only/);
    expect(link.className).toMatch(/focus:fixed/);
    expect(link.className).toMatch(/focus:z-50/);
  });

  it('renders the provided label text', () => {
    const customLabel = 'Jump to main content';
    render(<SkipLink label={customLabel} />);
    
    expect(screen.getByText(customLabel)).toBeInTheDocument();
  });
});
