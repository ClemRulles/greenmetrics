'use client';

import { Button } from '@/components/ui/Button';
import { useTheme } from '@/components/providers/ThemeProvider';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { SkipLink } from '@/components/a11y/SkipLink';
import { Sun, Moon } from 'lucide-react';

export interface AppHeaderProps {
  locale: 'en' | 'fr';
  translations: {
    skipToContent: string;
    themeToggle: string;
  };
}

export function AppHeader({ locale, translations }: AppHeaderProps) {
  const { theme, toggle } = useTheme();

  return (
    <>
      <SkipLink label={translations.skipToContent} />
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-surface/80 backdrop-blur supports-[backdrop-filter]:bg-surface/60">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded-md" 
              style={{ backgroundColor: 'var(--brand-blue)' }}
              aria-hidden="true"
            />
            <span className="font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              GreenMetrics
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <LocaleSwitcher currentLocale={locale} />
            <Button 
              variant="ghost" 
              size="sm"
              aria-label={translations.themeToggle}
              onClick={toggle}
              className="px-2"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </header>
    </>
  );
}
