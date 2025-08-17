'use client';

import React from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';

interface DashboardClientProps {
  locale: string;
  translations: {
    dashboard: string;
    signedInHint: string;
    signOut: string;
  };
}

export function DashboardClient({ locale, translations }: DashboardClientProps) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{translations.dashboard}</h1>
      <p className="text-gray-700">{translations.signedInHint}</p>
      
      <div className="space-y-2">
        <Link 
          href={`/${locale}/app/reports`}
          className="inline-block rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Manage Reports
        </Link>
      </div>
      
      <button 
        className="rounded bg-gray-800 px-4 py-2 text-white" 
        onClick={() => signOut()}
      >
        {translations.signOut}
      </button>
    </div>
  );
}
