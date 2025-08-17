import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import Page from '@/app/[locale]/app/reports/new/page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ locale: 'en' }),
}));

test('renders wizard title', () => {
  render(<Page />);
  expect(screen.getByText(/Data Entry Wizard/i)).toBeInTheDocument();
});
