"use client";

/**
 * SectionHeader - Consistent section headers with optional actions
 */
import React from 'react';
import { motion } from 'framer-motion';
import { variants, transitionClasses } from '@/lib/ui/motion';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  level?: 2 | 3 | 4;
  className?: string;
  animate?: boolean;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ 
  title, 
  subtitle, 
  action, 
  level = 2,
  className = '',
  animate = true 
}) => {
  const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
  
  const content = (
    <div className={`flex items-start justify-between gap-lg ${className}`}>
      <div className="flex-1 min-w-0">
        <HeadingTag 
          className={`
            font-semibold text-neutral-900 leading-tight tracking-tight
            ${level === 2 ? 'text-2xl' : level === 3 ? 'text-xl' : 'text-lg'}
          `}
        >
          {title}
        </HeadingTag>
        {subtitle && (
          <p className="mt-xs text-sm text-neutral-600 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      
      {action && (
        <div className={`flex-shrink-0 ${transitionClasses.interactive}`}>
          {action}
        </div>
      )}
    </div>
  );

  if (!animate) {
    return content;
  }

  return (
    <motion.div 
      variants={variants.slideInUp}
      initial="hidden"
      animate="visible"
    >
      {content}
    </motion.div>
  );
};

export default SectionHeader;
