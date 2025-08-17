"use client";

import React from 'react';
import Link from 'next/link';

export default function LocaleError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html>
      <body className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-lg p-6 bg-white rounded shadow">
          <h1 className="text-2xl font-semibold mb-2">Something went wrong</h1>
          <p className="text-sm text-gray-600 mb-4">An error occurred while rendering this page.</p>
          <div className="flex gap-3">
            <button onClick={() => reset()} className="px-3 py-2 bg-blue-600 text-white rounded">Try again</button>
            <Link href="/en" className="px-3 py-2 border rounded">Go home</Link>
          </div>
        </div>
      </body>
    </html>
  );
}
