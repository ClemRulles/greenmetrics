"use client";

import React from 'react';
import Simulator from './Simulator';

type Props = React.ComponentProps<typeof Simulator>;

export default function SimulatorClient(props: Props) {
  return <Simulator {...props} />;
}
