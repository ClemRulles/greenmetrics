import type { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { locales, type Locale } from '@/i18n';

export default async function ProtectedLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = (locales as readonly string[]).includes(localeParam) ? (localeParam as Locale) : 'en';
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect(`/${locale}/auth/signin?callbackUrl=/${locale}/app`);
  }

  return (
    <section className="mx-auto max-w-4xl p-6">
      {children}
    </section>
  );
}
