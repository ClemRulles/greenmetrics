import React from 'react';
import { render, screen } from '@testing-library/react';
import LandingClient from '@/components/landing/LandingClient';

// Minimal landing prop used for render test
const landing = {
  headline: 'Test headline',
  sub: 'Test subtitle',
  primaryCta: 'Get started',
  secondaryCta: 'Learn more',
  privacy: 'Privacy-first',
  traceability: 'Traceable',
  speed: 'Fast'
};

describe('LandingClient render', () => {
  it('renders hero, value cards and simulator header', () => {
    render(<LandingClient landing={landing} />);

  // Hero headline
  expect(screen.getByText(/Test headline/i)).toBeTruthy();
  // Value cards use headings (h3) so query by role to avoid matching duplicate substrings
  expect(screen.getByRole('heading', { name: /Privacy-first/i })).toBeTruthy();
  expect(screen.getByRole('heading', { name: /Traceable/i })).toBeTruthy();
  expect(screen.getByRole('heading', { name: /Fast/i })).toBeTruthy();
  // Section header for simulator (h2)
  expect(screen.getByRole('heading', { name: /Mini simulator/i })).toBeTruthy();
  });
});
