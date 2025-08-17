import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/en',
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('LocaleSwitcher', () => {
  it('renders EN and FR buttons', () => {
    const { getByRole } = render(<LocaleSwitcher currentLocale="en" />);
    expect(getByRole('button', { name: /EN/i })).toBeInTheDocument();
    expect(getByRole('button', { name: /FR/i })).toBeInTheDocument();
  });
});
