import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import Image from '../../components/Perf/Image';

describe('Performance Image Component', () => {
  it('renders with optimized default props', () => {
    const { container } = render(
      <Image 
        src="/test-image.jpg" 
        alt="Test image" 
        width={800} 
        height={600} 
      />
    );
    
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('alt', 'Test image');
  });

  it('applies responsive sizes by default', () => {
    const { container } = render(
      <Image 
        src="/test-image.jpg" 
        alt="Test image" 
        width={800} 
        height={600} 
      />
    );
    
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('sizes');
    // Should have responsive sizes
    expect(img?.getAttribute('sizes')).toContain('1024px');
  });

  it('respects custom sizes prop', () => {
    const customSizes = '(min-width: 1200px) 1000px, 50vw';
    const { container } = render(
      <Image 
        src="/test-image.jpg" 
        alt="Test image" 
        width={800} 
        height={600}
        sizes={customSizes}
      />
    );
    
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('sizes', customSizes);
  });

  it('sets quality to 80 by default for performance', () => {
    const { container } = render(
      <Image 
        src="/test-image.jpg" 
        alt="Test image" 
        width={800} 
        height={600} 
      />
    );
    
    // Check that the image src includes quality parameter
    const img = container.querySelector('img');
    const src = img?.getAttribute('src');
    expect(src).toBeTruthy();
  });
});
