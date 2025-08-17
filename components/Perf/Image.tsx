'use client';
import NextImage, { ImageProps } from 'next/image';

interface OptimizedImageProps extends ImageProps {
  // Enhanced props for better performance - extend as needed
}

export default function Image(props: OptimizedImageProps) {
  const { 
    sizes = '(min-width: 1024px) 800px, (min-width: 768px) 100vw, 100vw',
    placeholder = 'empty',
    quality = 80,
    priority = false,
    ...rest 
  } = props;

  return (
    <NextImage 
      sizes={sizes}
      placeholder={placeholder}
      quality={quality}
      priority={priority}
      {...rest}
    />
  );
}
