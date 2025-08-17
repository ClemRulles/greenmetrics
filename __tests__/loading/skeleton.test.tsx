import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { Skeleton } from '../../components/loading/Skeleton';

describe('Skeleton', () => {
  it('renders with default classes', () => {
    render(<Skeleton />);
    
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass('animate-pulse', 'rounded-md', 'bg-slate-200', 'dark:bg-slate-700');
    expect(skeleton).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies custom className', () => {
    render(<Skeleton className="w-4 h-4" />);
    
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass('w-4', 'h-4');
  });
});
