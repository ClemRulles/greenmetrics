import React from 'react';
import { render, screen } from '@testing-library/react';
import LandingClient from '@/components/landing/LandingClient';

// Minimal landing prop used for render test
const landing = {
  hero: {
    title: 'Test headline',
    subtitle: 'Test subtitle',
    ctaPrimary: 'Get started',
    ctaSecondary: 'Learn more'
  },
  value: {
    title: 'Value title',
    subtitle: 'Value subtitle',
    items: [
      { title: 'Confidential by default', desc: 'desc' },
      { title: 'Traceable', desc: 'desc' },
      { title: '48h Certificates', desc: 'desc' }
    ]
  },
  sim: { title: 'Simulator', subtitle: 'Try it' },
  testimonials: []
};

describe('LandingClient render', () => {
  it('renders hero h1 and CTAs', () => {
    render(<LandingClient landing={landing} />);
  const h1 = screen.getByRole('heading', { level: 1 });
  if (!h1.textContent || !/Test headline/i.test(h1.textContent)) throw new Error('h1 text mismatch');
  if (!screen.getByRole('link', { name: /Get started/i })) throw new Error('primary CTA missing');
  if (!screen.getByRole('link', { name: /Learn more/i })) throw new Error('secondary CTA missing');
  });
});
