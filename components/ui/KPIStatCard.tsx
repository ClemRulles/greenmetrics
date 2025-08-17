"use client";
/**
 * KPIStatCard - Data visualization card with sparkline chart
 */
import React from 'react';
import { motion } from 'framer-motion';
import { variants, transitionClasses } from '@/lib/ui/motion';

interface SparklineData {
  value: number;
  timestamp?: string | Date;
}

interface KPIStatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: {
    value: number;
    period: string;
    trend: 'up' | 'down' | 'neutral';
  };
  sparkline?: SparklineData[];
  status?: 'good' | 'warning' | 'critical' | 'neutral';
  className?: string;
  animate?: boolean;
  onClick?: () => void;
}

const SparklineChart: React.FC<{ data: SparklineData[]; trend?: 'up' | 'down' | 'neutral' }> = ({ 
  data, 
  trend = 'neutral' 
}) => {
  if (!data || data.length < 2) return null;
  
  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  
  // SVG path for sparkline
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((d.value - min) / range) * 100;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');
  
  const strokeColor = 
    trend === 'up' ? 'var(--green)' : 
    trend === 'down' ? 'var(--red)' : 
    'var(--neutral-400)';
  
  return (
    <div className="h-8 w-24">
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d={points}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
};

const TrendIndicator: React.FC<{ change: KPIStatCardProps['change'] }> = ({ change }) => {
  if (!change) return null;
  
  const { value, period, trend } = change;
  const isPositive = trend === 'up';
  const isNegative = trend === 'down';
  
  const textColor = isPositive ? 'text-green' : isNegative ? 'text-red' : 'text-neutral-600';
  const bgColor = isPositive ? 'bg-green/10' : isNegative ? 'bg-red/10' : 'bg-neutral-100';
  
  const icon = isPositive ? '↗' : isNegative ? '↘' : '→';
  
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${textColor} ${bgColor}`}>
      <span aria-hidden="true">{icon}</span>
      <span>{Math.abs(value)}%</span>
      <span className="text-neutral-500">{period}</span>
    </div>
  );
};

export const KPIStatCard: React.FC<KPIStatCardProps> = ({
  title,
  value,
  unit,
  change,
  sparkline,
  status = 'neutral',
  className = '',
  animate = true,
  onClick
}) => {
  const borderColor = {
    good: 'border-green/20',
    warning: 'border-amber/20', 
    critical: 'border-red/20',
    neutral: 'border-neutral-200'
  }[status];
  
  const isInteractive = !!onClick;
  
  const content = (
    <div 
      className={`
        bg-white rounded-lg border-2 p-lg shadow-sm
        ${borderColor}
        ${isInteractive ? `cursor-pointer hover:shadow-md ${transitionClasses.interactive}` : ''}
        ${className}
      `}
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={isInteractive ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      } : undefined}
    >
      {/* Header with title and sparkline */}
      <div className="flex items-start justify-between mb-md">
        <h3 className="text-sm font-medium text-neutral-700 leading-tight">
          {title}
        </h3>
        {sparkline && (
          <SparklineChart data={sparkline} trend={change?.trend} />
        )}
      </div>
      
      {/* Main value */}
      <div className="mb-sm">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-neutral-900 tabular-nums">
            {value}
          </span>
          {unit && (
            <span className="text-lg text-neutral-600">
              {unit}
            </span>
          )}
        </div>
      </div>
      
      {/* Trend indicator */}
      {change && (
        <TrendIndicator change={change} />
      )}
    </div>
  );

  if (!animate) {
    return content;
  }

  return (
    <motion.div 
      variants={variants.scaleIn}
      initial="hidden"
      animate="visible"
      whileHover={isInteractive ? { scale: 1.02 } : undefined}
      whileTap={isInteractive ? { scale: 0.98 } : undefined}
    >
      {content}
    </motion.div>
  );
};

export default KPIStatCard;
