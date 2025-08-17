import React from 'react';

export function Banner({ 
  status, 
  until, 
  translations 
}: { 
  status: 'ok'|'grace'|'frozen'; 
  until?: string|null; 
  translations: {
    frozenTitle: string;
    graceTitle: string;
    frozen: string;
    grace: string;
    updatePayment: string;
  };
}) {
  if (status === 'ok') return null;
  
  const isGrace = status === 'grace';
  const isFrozen = status === 'frozen';
  
  const baseClasses = "mb-4 rounded-lg border p-4 flex items-start gap-3";
  const statusClasses = isFrozen
    ? 'bg-red-50 text-red-800 border-red-200'
    : 'bg-amber-50 text-amber-800 border-amber-200';
  
  const Icon = isFrozen ? (
    <svg className="h-5 w-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg className="h-5 w-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  );

  return (
    <div className={`${baseClasses} ${statusClasses}`}>
      {Icon}
      <div className="flex-1">
        <p className="text-sm font-medium mb-1">
          {isFrozen ? translations.frozenTitle : translations.graceTitle}
        </p>
        <p className="text-sm">
          {isFrozen
            ? translations.frozen
            : translations.grace.replace('{date}', until ?? '')}
        </p>
        {(isGrace || isFrozen) && (
          <form action="/api/billing/portal" method="post" className="mt-2">
            <button 
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-sm font-medium shadow-sm border hover:bg-gray-50 transition-colors"
            >
              {translations.updatePayment}
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
