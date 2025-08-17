'use client';
import React, { useEffect, useState } from 'react';

type Entitlements = {
  plan: 'FREE'|'BASIC'|'PRO';
  isFrozen: boolean;
  graceUntil?: string | null;
};

export function EntitlementGuard({
  entitlements,
  children,
  BannerComponent,
}: {
  entitlements: Entitlements;
  children: React.ReactNode;
  BannerComponent: (p: {status: 'ok'|'grace'|'frozen'; until?: string|null}) => JSX.Element;
}) {
  const { isFrozen, graceUntil } = entitlements;
  const status: 'ok'|'grace'|'frozen' =
    isFrozen ? 'frozen' : graceUntil ? 'grace' : 'ok';

  return (
    <>
      {status !== 'ok' && <BannerComponent status={status} until={graceUntil ?? null} />}
      {status === 'frozen' ? null : children}
    </>
  );
}
