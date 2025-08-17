'use client';
import * as React from 'react';

export function Announcer() {
  return (
    <div 
      id="app-announcer" 
      data-testid="announcer"
      aria-live="polite" 
      aria-atomic="true" 
      role="status"
      className="sr-only" 
    />
  );
}
