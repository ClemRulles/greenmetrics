"use client";

import React, { useEffect, useState, type ReactNode } from 'react';

let MotionConfig: any;
try {
  // require at runtime to avoid server import-time errors
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  MotionConfig = require('framer-motion').MotionConfig;
} catch (e) {
  MotionConfig = undefined;
}

type Props = { children: ReactNode };

export default function ReducedMotionGate({ children }: Props) {
  const [prefersReduced, setPrefersReduced] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      setPrefersReduced(false);
      return;
    }

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setPrefersReduced(Boolean(mq.matches));
    handler();
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', handler);
      else mq.removeListener(handler as any);
    };
  }, []);

  // while we don't know the user's preference, render children as-is
  if (prefersReduced === null) return <>{children}</>;

  if (prefersReduced) return <div data-allow-motion="false">{children}</div>;

  if (MotionConfig) {
    return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
  }

  return <div data-allow-motion="true">{children}</div>;
}
