import type { Locale } from '@/i18n';

export function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
}
