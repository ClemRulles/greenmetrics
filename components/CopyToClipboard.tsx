'use client';

import { useState } from 'react';

interface CopyToClipboardProps {
  value: string;
  label?: string;
  className?: string;
}

export function CopyToClipboard({ value, label = 'Copy link', className = '' }: CopyToClipboardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  return (
    <button
      type="button"
      aria-live="polite"
      aria-label={copied ? 'Link copied to clipboard' : label}
      className={`px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${className}`}
      onClick={handleCopy}
    >
      {copied ? 'Copied!' : label}
    </button>
  );
}
