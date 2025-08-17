import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import Page from '@/app/[locale]/app/reports/[id]/page';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'r', locale: 'en' }),
}));

test('renders compute and download buttons', () => {
  render(<Page />);
  expect(screen.getByRole('button', { name: /Compute totals/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Download PDF/i })).toBeInTheDocument();
});
