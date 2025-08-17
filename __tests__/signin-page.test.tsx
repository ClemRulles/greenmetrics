import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import SignInPage from '@/app/[locale]/auth/signin/page';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ locale: 'en' }),
}));

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}));

test('renders email label and submit button', () => {
  const { getByLabelText, getByRole } = render(<SignInPage />);
  expect(getByLabelText(/work email/i)).toBeInTheDocument();
  expect(getByRole('button', { name: /sign in/i })).toBeInTheDocument();
});
