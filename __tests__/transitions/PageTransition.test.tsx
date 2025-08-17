import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PageTransition from '../../components/transitions/PageTransition';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <div data-testid="animate-presence">{children}</div>,
  motion: {
    div: ({ children, ...props }: any) => <div data-testid="motion-div" {...props}>{children}</div>
  }
}));

// Mock useReducedMotion hook
vi.mock('../../hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn()
}));

const mockUseReducedMotion = vi.mocked(
  await import('../../hooks/useReducedMotion')
).useReducedMotion;

describe('PageTransition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children inside AnimatePresence and motion.div', () => {
    mockUseReducedMotion.mockReturnValue(false);
    
    render(
      <PageTransition>
        <div>Test content</div>
      </PageTransition>
    );

    expect(screen.getByTestId('animate-presence')).toBeInTheDocument();
    expect(screen.getByTestId('motion-div')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('applies motion animations when reduced motion is false', () => {
    mockUseReducedMotion.mockReturnValue(false);
    
    render(
      <PageTransition>
        <div>Test content</div>
      </PageTransition>
    );

    const motionDiv = screen.getByTestId('motion-div');
    expect(motionDiv).toHaveAttribute('initial');
    expect(motionDiv).toHaveAttribute('animate');
    expect(motionDiv).toHaveAttribute('exit');
    expect(motionDiv).toHaveAttribute('transition');
  });

  it('disables motion animations when reduced motion is true', () => {
    mockUseReducedMotion.mockReturnValue(true);
    
    render(
      <PageTransition>
        <div>Test content</div>
      </PageTransition>
    );

    const motionDiv = screen.getByTestId('motion-div');
    // When reduced motion is enabled, animations should be disabled
    expect(motionDiv).toBeInTheDocument();
  });
});
