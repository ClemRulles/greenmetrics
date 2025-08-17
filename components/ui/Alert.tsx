import * as React from 'react';
import { cn } from '@/lib/cn';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'destructive';
}

export function Alert({ className, variant = 'default', ...props }: AlertProps) {
  const variants = {
    default: 'bg-slate-50 border-slate-200 text-slate-900 dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-100',
    success: 'bg-green-50 border-green-200 text-green-900 dark:bg-green-900/20 dark:border-green-800 dark:text-green-100',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-100',
    destructive: 'bg-red-50 border-red-200 text-red-900 dark:bg-red-900/20 dark:border-red-800 dark:text-red-100',
  };

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        variants[variant],
        className
      )}
      role="alert"
      {...props}
    />
  );
}

export interface AlertTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

export function AlertTitle({ className, children, ...props }: AlertTitleProps) {
  return (
    <h5
      className={cn('mb-1 font-medium leading-none tracking-tight', className)}
      {...props}
    >
      {children}
    </h5>
  );
}

export interface AlertDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function AlertDescription({ className, ...props }: AlertDescriptionProps) {
  return (
    <div
      className={cn('text-sm opacity-90', className)}
      {...props}
    />
  );
}

export interface AlertIconProps {
  variant?: AlertProps['variant'];
  className?: string;
}

export function AlertIcon({ variant = 'default', className }: AlertIconProps) {
  const iconMap = {
    default: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    destructive: AlertCircle,
  };

  const Icon = iconMap[variant];
  
  return (
    <Icon 
      className={cn('h-4 w-4', className)} 
      aria-hidden="true"
    />
  );
}
