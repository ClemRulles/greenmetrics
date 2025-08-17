import * as React from 'react';

export interface VisuallyHiddenProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export function VisuallyHidden({ children, asChild = false }: VisuallyHiddenProps) {
  const Component = asChild ? React.Fragment : 'span';
  
  const styles = {
    position: 'absolute' as const,
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden' as const,
    clip: 'rect(0,0,0,0)',
    whiteSpace: 'nowrap' as const,
    border: 0,
  };

  if (asChild) {
    return <>{children}</>;
  }

  return (
    <span className="sr-only" style={styles}>
      {children}
    </span>
  );
}
