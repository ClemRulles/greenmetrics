import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { Announcer } from '../../components/feedback/Announcer';

describe('Announcer', () => {
  it('renders with correct accessibility attributes', () => {
    render(<Announcer />);
    
    const announcer = screen.getByRole('status');
    expect(announcer).toHaveAttribute('id', 'app-announcer');
    expect(announcer).toHaveAttribute('aria-live', 'polite');
    expect(announcer).toHaveAttribute('aria-atomic', 'true');
    expect(announcer).toHaveAttribute('role', 'status');
    expect(announcer).toHaveClass('sr-only');
  });

  it('has correct testid for testing', () => {
    render(<Announcer />);
    
    const announcer = screen.getByTestId('announcer');
    expect(announcer).toBeInTheDocument();
  });
});
