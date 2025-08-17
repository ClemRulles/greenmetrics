import * as React from 'react';
import { cn } from '@/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      data-testid="skeleton"
      className={cn('animate-pulse rounded-md bg-slate-200 dark:bg-slate-700', className)}
      aria-hidden="true"
    />
  );
}
