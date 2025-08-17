"use client";

import React from 'react';
import SectionHeader from './SectionHeader';

type Props = React.ComponentProps<typeof SectionHeader>;

export default function SectionHeaderClient(props: Props) {
  return <SectionHeader {...props} />;
}
