import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { locales, type Locale } from '@/i18n';
import { SignInForm } from '@/app/[locale]/auth/signin/SignInForm';
import en from '@/public/locales/en/common.json';
import fr from '@/public/locales/fr/common.json';

const dict = { en, fr } as const;

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string }> }
): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = locales.includes(localeParam as Locale) ? (localeParam as Locale) : 'en';
  const t = dict[locale].auth;
  return { 
    title: t.signIn,
    description: 'Sign in to your GreenMetrics account for ESG reporting and carbon tracking'
  };
}

export default async function SignInPage({ 
  params, 
  searchParams 
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const { locale: localeParam } = await params;
  const { callbackUrl } = await searchParams;
  
  const locale = locales.includes(localeParam as Locale) ? (localeParam as Locale) : 'en';
  const target = callbackUrl || `/${locale}/app`;

  // If already signed in, redirect to target
  if (session) {
    redirect(target);
  }

  const t = dict[locale].auth;
  const translations = {
    signIn: t.signIn,
    email: t.email,
    linkSent: t.linkSent,
    signInHelp: t.signInHelp
  };

  return (
    <main className="mx-auto max-w-md p-6 space-y-4">
      <h1 className="text-2xl font-semibold">{translations.signIn}</h1>
      <SignInForm 
        locale={locale} 
        callbackUrl={target}
        translations={translations}
      />
      <p className="text-sm text-gray-600">{translations.signInHelp}</p>
    </main>
  );
}
