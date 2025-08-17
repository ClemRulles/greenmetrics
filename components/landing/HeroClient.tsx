"use client";

import React from 'react';
import Hero from '@/components/landing/Hero';

type Props = React.ComponentProps<typeof Hero>;

export default function HeroClient(props: Props) {
  return <Hero {...props} />;
}
