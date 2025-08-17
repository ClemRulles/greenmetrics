"use client";

import { useEffect, useRef, useState } from 'react';

type Options = { to: number; durationMs?: number };

export default function useCountUp({ to, durationMs = 1200 }: Options) {
  const [value, setValue] = useState<number>(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setValue(to);
      return;
    }

    const mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduced = mq ? mq.matches : false;
    if (reduced) {
      setValue(to);
      return;
    }

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - (startRef.current || 0);
      const t = Math.min(1, elapsed / durationMs);
      const eased = easeOutCubic(t);
      const current = Math.round(to * eased);
      setValue(current);
      if (t < 1) {
        rafRef.current = (window.requestAnimationFrame as any)(tick);
      } else {
        setValue(to);
        rafRef.current = null;
      }
    };

    rafRef.current = (window.requestAnimationFrame as any)(tick);

    return () => {
      if (rafRef.current != null) {
        try {
          window.cancelAnimationFrame(rafRef.current as number);
        } catch (e) {}
        rafRef.current = null;
      }
    };
  }, [to, durationMs]);

  return value;
}
