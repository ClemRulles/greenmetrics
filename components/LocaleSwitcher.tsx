'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { locales, type Locale } from '@/i18n';

export function LocaleSwitcher({ currentLocale }: { currentLocale: Locale }) {
  const pathname = usePathname() || '/en';

  const buildLocaleUrl = (locale: Locale) => {
    const parts = pathname.split('/');
    // ensure leading empty '' then locale segment at index 1
    if (locales.includes(parts[1] as Locale)) {
      parts[1] = locale;
    } else {
      parts.splice(1, 0, locale);
    }
    return parts.join('/');
  };

  return (
    <div className="flex gap-2" role="group" aria-label="Language selector">
      {locales.map((locale) => (
        <Link
          key={locale}
          href={buildLocaleUrl(locale)}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            locale === currentLocale ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
          }`}
          aria-current={locale === currentLocale ? 'page' : undefined}
        >
          {locale.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}
