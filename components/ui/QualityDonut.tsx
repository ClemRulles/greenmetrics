/**
 * QualityDonut - SVG donut chart for quality grades
 */
import React from 'react';
import { motion } from 'framer-motion';
import { variants } from '@/lib/ui/motion';

interface QualityScore {
  label: string;
  value: number;
  color: string;
  grade?: 'A' | 'B' | 'C' | 'D' | 'F';
}

interface QualityDonutProps {
  scores: QualityScore[];
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  centerContent?: React.ReactNode;
  className?: string;
  animate?: boolean;
}

const sizeConfig = {
  sm: { radius: 60, stroke: 8, viewBox: 140 },
  md: { radius: 80, stroke: 12, viewBox: 180 },
  lg: { radius: 100, stroke: 16, viewBox: 220 },
};

const gradeColors = {
  A: 'var(--green)',
  B: 'var(--emerald)', 
  C: 'var(--amber)',
  D: 'var(--red)',
  F: 'var(--red)',
};

export const QualityDonut: React.FC<QualityDonutProps> = ({
  scores,
  size = 'md',
  showLabels = true,
  centerContent,
  className = '',
  animate = true
}) => {
  const { radius, stroke, viewBox } = sizeConfig[size];
  const center = viewBox / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate total and percentages
  const total = scores.reduce((sum, score) => sum + score.value, 0);
  let cumulativePercentage = 0;
  
  const segments = scores.map((score) => {
    const percentage = total > 0 ? (score.value / total) * 100 : 0;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    const rotation = cumulativePercentage * 3.6; // Convert to degrees
    
    const result = {
      ...score,
      percentage,
      strokeDasharray,
      strokeDashoffset,
      rotation,
      color: score.grade ? gradeColors[score.grade] : score.color,
    };
    
    cumulativePercentage += percentage;
    return result;
  });

  const DonutSegment: React.FC<{ segment: typeof segments[0]; index: number }> = ({ 
    segment, 
    index 
  }) => (
    <motion.circle
      cx={center}
      cy={center}
      r={radius}
      fill="none"
      stroke={segment.color}
      strokeWidth={stroke}
      strokeDasharray={segment.strokeDasharray}
      strokeDashoffset={animate ? circumference : segment.strokeDashoffset}
      strokeLinecap="round"
      transform={`rotate(${segment.rotation - 90} ${center} ${center})`}
      className="drop-shadow-sm"
      initial={animate ? { strokeDashoffset: circumference } : undefined}
      animate={animate ? { strokeDashoffset: segment.strokeDashoffset } : undefined}
      transition={animate ? { 
        duration: 0.8, 
        delay: index * 0.1,
        ease: [0.0, 0.0, 0.2, 1] 
      } : undefined}
    />
  );

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      <div className="relative">
        <svg 
          width={viewBox} 
          height={viewBox} 
          viewBox={`0 0 ${viewBox} ${viewBox}`}
          className="transform -rotate-90"
          role="img"
          aria-label={`Quality distribution: ${scores.map(s => `${s.label} ${((s.value / total) * 100).toFixed(1)}%`).join(', ')}`}
        >
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="var(--neutral-200)"
            strokeWidth={stroke}
          />
          
          {/* Data segments */}
          {segments.map((segment, index) => (
            <DonutSegment key={segment.label} segment={segment} index={index} />
          ))}
        </svg>
        
        {/* Center content */}
        {centerContent && (
          <div 
            className="absolute inset-0 flex items-center justify-center text-center transform rotate-90"
            style={{ fontSize: size === 'sm' ? '0.75rem' : size === 'md' ? '0.875rem' : '1rem' }}
          >
            {centerContent}
          </div>
        )}
      </div>
      
      {/* Legend */}
      {showLabels && (
        <motion.div 
          className="mt-lg grid grid-cols-2 gap-sm text-xs"
          variants={animate ? variants.fadeIn : undefined}
          initial={animate ? "hidden" : undefined}
          animate={animate ? "visible" : undefined}
          transition={animate ? { delay: 0.6 } : undefined}
        >
          {segments.map((segment) => (
            <div key={segment.label} className="flex items-center gap-xs">
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: segment.color }}
                aria-hidden="true"
              />
              <span className="text-neutral-700 font-medium">
                {segment.label}
              </span>
              <span className="text-neutral-500 ml-auto tabular-nums">
                {segment.percentage.toFixed(1)}%
              </span>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default QualityDonut;
