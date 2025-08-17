import * as React from 'react';
import { cn } from '@/lib/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 dark:border-slate-800 shadow-soft bg-surface p-6',
        className
      )}
      {...props}
    />
  );
}

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export function CardTitle({ className, children, ...props }: CardTitleProps) {
  return (
    <h2
      className={cn('text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3', className)}
      {...props}
    >
      {children}
    </h2>
  );
}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardContent({ className, ...props }: CardContentProps) {
  return (
    <div
      className={cn('text-slate-700 dark:text-slate-300', className)}
      {...props}
    />
  );
}
