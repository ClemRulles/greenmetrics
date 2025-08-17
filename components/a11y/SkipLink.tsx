'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

export interface SkipLinkProps {
  label: string;
  href?: string;
}

export function SkipLink({ label, href = "#main-content" }: SkipLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        'sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2',
        'focus:z-50 focus:bg-brand focus:text-brand-fg focus:px-3 focus:py-2',
        'focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring',
        'focus:ring-offset-2 focus:ring-offset-background',
        'transition-all duration-200'
      )}
    >
      {label}
    </Link>
  );
}
