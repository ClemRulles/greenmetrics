'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';

interface SignInFormProps {
  locale: string;
  callbackUrl: string;
  translations: {
    signIn: string;
    email: string;
    linkSent: string;
    signInHelp: string;
  };
}

export function SignInForm({ callbackUrl, translations }: SignInFormProps) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await signIn('email', { email, callbackUrl, redirect: false });
    if (res?.ok) setSent(true);
  };

  if (sent) {
    return <p role="status">{translations.linkSent}</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block">
        <span className="block mb-1">{translations.email}</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border px-3 py-2"
          aria-label={translations.email}
        />
      </label>
      <button className="rounded bg-blue-600 px-4 py-2 text-white">
        {translations.signIn}
      </button>
    </form>
  );
}
