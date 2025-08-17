/**
 * CoverageProgress - Linear progress bar for coverage metrics
 */
import React from 'react';
import { motion } from 'framer-motion';
import { transitionClasses } from '@/lib/ui/motion';

interface CoverageProgressProps {
  label: string;
  current: number;
  target: number;
  unit?: string;
  showPercentage?: boolean;
  color?: 'blue' | 'green' | 'amber' | 'red';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animate?: boolean;
}

const colorConfig = {
  blue: {
    bg: 'bg-blue/10',
    fill: 'bg-blue',
    text: 'text-blue',
  },
  green: {
    bg: 'bg-green/10',
    fill: 'bg-green',
    text: 'text-green',
  },
  amber: {
    bg: 'bg-amber/10',
    fill: 'bg-amber',
    text: 'text-amber',
  },
  red: {
    bg: 'bg-red/10',
    fill: 'bg-red',
    text: 'text-red',
  },
};

const sizeConfig = {
  sm: {
    height: 'h-1.5',
    text: 'text-xs',
    gap: 'gap-xs',
  },
  md: {
    height: 'h-2.5',
    text: 'text-sm',
    gap: 'gap-sm',
  },
  lg: {
    height: 'h-3',
    text: 'text-base',
    gap: 'gap-md',
  },
};

export const CoverageProgress: React.FC<CoverageProgressProps> = ({
  label,
  current,
  target,
  unit = '',
  showPercentage = true,
  color = 'blue',
  size = 'md',
  className = '',
  animate = true
}) => {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const isComplete = current >= target;
  const actualColor = isComplete ? 'green' : color;
  
  const { bg, fill, text } = colorConfig[actualColor];
  const { height, text: textSize, gap } = sizeConfig[size];
  
  return (
    <div className={`w-full ${className}`}>
      {/* Header with label and values */}
      <div className={`flex items-center justify-between ${gap} mb-xs`}>
        <span className={`font-medium text-neutral-700 ${textSize}`}>
          {label}
        </span>
        <div className={`flex items-center ${gap} ${textSize}`}>
          <span className="text-neutral-900 font-semibold tabular-nums">
            {current.toLocaleString()}{unit}
          </span>
          <span className="text-neutral-500">
            / {target.toLocaleString()}{unit}
          </span>
          {showPercentage && (
            <span className={`font-semibold tabular-nums ${text}`}>
              {percentage.toFixed(1)}%
            </span>
          )}
        </div>
      </div>
      
      {/* Progress bar */}
      <div 
        className={`relative w-full rounded-full overflow-hidden ${bg} ${height}`}
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${current} of ${target} ${unit} (${percentage.toFixed(1)}%)`}
      >
        <motion.div
          className={`absolute left-0 top-0 h-full rounded-full ${fill} ${transitionClasses.layout}`}
          initial={animate ? { width: 0 } : { width: `${percentage}%` }}
          animate={{ width: `${percentage}%` }}
          transition={animate ? { 
            duration: 0.8, 
            ease: [0.0, 0.0, 0.2, 1],
            delay: 0.2 
          } : undefined}
        />
        
        {/* Completion indicator */}
        {isComplete && (
          <motion.div
            className="absolute right-1 top-1/2 transform -translate-y-1/2"
            initial={animate ? { scale: 0, opacity: 0 } : undefined}
            animate={{ scale: 1, opacity: 1 }}
            transition={animate ? { 
              duration: 0.3, 
              delay: 1,
              type: "spring",
              stiffness: 200 
            } : undefined}
          >
            <div className="w-2 h-2 bg-white rounded-full shadow-sm" />
          </motion.div>
        )}
      </div>
      
      {/* Status indicator */}
      {percentage >= 90 && (
        <motion.div 
          className="mt-xs flex items-center gap-xs"
          initial={animate ? { opacity: 0, y: -5 } : undefined}
          animate={{ opacity: 1, y: 0 }}
          transition={animate ? { delay: 1.2 } : undefined}
        >
          <span className="text-green text-xs" aria-hidden="true">✓</span>
          <span className="text-xs text-green font-medium">
            {isComplete ? 'Target reached' : 'Near target'}
          </span>
        </motion.div>
      )}
    </div>
  );
};

export default CoverageProgress;
