'use client';

import React from 'react';

export interface ChartDataPoint {
  period: string; // "2025-08" or "Aug 2025" format
  value: number;
  quality?: 'A' | 'B' | 'C';
  isEstimated?: boolean;
}

export interface EmissionChartProps {
  data: ChartDataPoint[];
  title: string;
  type: 'monthly' | 'ytd' | 'trailing12';
  targetValue?: number;
  unit?: string;
  height?: number;
  showQualityIndicators?: boolean;
}

/**
 * Basic emission chart component for monthly cadence dashboard
 * Displays monthly emissions, YTD, and trailing 12-month data
 */
export function EmissionChart({
  data,
  title,
  type,
  targetValue,
  unit = 'tCO₂e',
  height = 300,
  showQualityIndicators = true,
}: EmissionChartProps) {
  const maxValue = Math.max(...data.map(d => d.value), targetValue || 0);
  const chartHeight = height - 80; // Reserve space for labels
  const chartWidth = 600;
  const barWidth = Math.min(40, chartWidth / data.length - 10);

  const formatPeriod = (period: string) => {
    if (period.includes('-')) {
      const [year, month] = period.split('-');
      return `${new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en', { month: 'short' })} ${year}`;
    }
    return period;
  };

  const getQualityColor = (quality?: string) => {
    switch (quality) {
      case 'A': return '#10b981'; // green
      case 'B': return '#f59e0b'; // amber
      case 'C': return '#ef4444'; // red
      default: return '#6b7280'; // gray
    }
  };

  const getBarOpacity = (isEstimated?: boolean) => {
    return isEstimated ? 0.6 : 1.0;
  };

  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      
      <div className="relative">
        <svg width={chartWidth} height={height} className="overflow-visible">
          {/* Y-axis grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
            <g key={ratio}>
              <line
                x1={50}
                y1={40 + (chartHeight * ratio)}
                x2={chartWidth - 20}
                y2={40 + (chartHeight * ratio)}
                stroke="#e5e7eb"
                strokeWidth={1}
              />
              <text
                x={45}
                y={45 + (chartHeight * ratio)}
                textAnchor="end"
                className="text-xs fill-gray-500"
              >
                {(maxValue * (1 - ratio)).toFixed(0)}
              </text>
            </g>
          ))}
          
          {/* Target line if provided */}
          {targetValue && (
            <line
              x1={50}
              y1={40 + (chartHeight * (1 - targetValue / maxValue))}
              x2={chartWidth - 20}
              y2={40 + (chartHeight * (1 - targetValue / maxValue))}
              stroke="#dc2626"
              strokeWidth={2}
              strokeDasharray="5,5"
            />
          )}
          
          {/* Data bars */}
          {data.map((point, index) => {
            const x = 60 + (index * (chartWidth - 80) / data.length);
            const barHeight = (point.value / maxValue) * chartHeight;
            const y = 40 + chartHeight - barHeight;
            
            return (
              <g key={point.period}>
                {/* Main bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={showQualityIndicators ? getQualityColor(point.quality) : '#3b82f6'}
                  opacity={getBarOpacity(point.isEstimated)}
                  className="hover:opacity-80 transition-opacity"
                />
                
                {/* Quality indicator dot */}
                {showQualityIndicators && point.quality && (
                  <circle
                    cx={x + barWidth / 2}
                    cy={y - 8}
                    r={3}
                    fill={getQualityColor(point.quality)}
                    className="drop-shadow-sm"
                  />
                )}
                
                {/* Estimated pattern overlay */}
                {point.isEstimated && (
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    fill="url(#estimatedPattern)"
                    opacity={0.3}
                  />
                )}
                
                {/* Value label */}
                <text
                  x={x + barWidth / 2}
                  y={y - (showQualityIndicators && point.quality ? 16 : 8)}
                  textAnchor="middle"
                  className="text-xs font-medium fill-gray-700"
                >
                  {point.value.toFixed(1)}
                </text>
                
                {/* Period label */}
                <text
                  x={x + barWidth / 2}
                  y={height - 20}
                  textAnchor="middle"
                  className="text-xs fill-gray-600"
                  transform={`rotate(-45 ${x + barWidth / 2} ${height - 20})`}
                >
                  {formatPeriod(point.period)}
                </text>
              </g>
            );
          })}
          
          {/* Pattern definition for estimated data */}
          <defs>
            <pattern id="estimatedPattern" patternUnits="userSpaceOnUse" width="4" height="4">
              <rect width="4" height="4" fill="white" opacity="0.5"/>
              <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke="white" strokeWidth="0.5"/>
            </pattern>
          </defs>
        </svg>
        
        {/* Target value label */}
        {targetValue && (
          <div 
            className="absolute left-0 text-xs text-red-600 font-medium bg-white px-1"
            style={{ 
              top: `${40 + (chartHeight * (1 - targetValue / maxValue)) - 8}px` 
            }}
          >
            Target: {targetValue.toFixed(1)} {unit}
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1">
          <span className="text-gray-600">Unit:</span>
          <span className="font-medium">{unit}</span>
        </div>
        
        {showQualityIndicators && (
          <>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Grade A</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span>Grade B</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>Grade C</span>
            </div>
          </>
        )}
        
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 bg-gray-400 opacity-60 relative">
            <div className="absolute inset-0 bg-white opacity-30" style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, white 2px, white 4px)'
            }}></div>
          </div>
          <span>Estimated</span>
        </div>
      </div>
    </div>
  );
}

export interface StatusBadgeProps {
  status: 'OK' | 'WATCH' | 'OFF_TRACK';
  percentage?: number;
  label?: string;
}

/**
 * Status badge for vs target comparison
 */
export function StatusBadge({ status, percentage, label = 'vs Target' }: StatusBadgeProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OK': return 'bg-green-100 text-green-800 border-green-200';
      case 'WATCH': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'OFF_TRACK': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OK': return '✓';
      case 'WATCH': return '⚠';
      case 'OFF_TRACK': return '✗';
      default: return '—';
    }
  };

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(status)}`}>
      <span className="mr-1">{getStatusIcon(status)}</span>
      <span>{status.replace('_', ' ')}</span>
      {percentage !== undefined && (
        <span className="ml-1">({percentage.toFixed(0)}%)</span>
      )}
      {label && (
        <span className="ml-1 text-xs opacity-75">{label}</span>
      )}
    </div>
  );
}

export interface EmissionsSummaryProps {
  monthlyData: ChartDataPoint[];
  ytdTotal: number;
  trailing12Total: number;
  targetValue?: number;
  vsTargetStatus?: 'OK' | 'WATCH' | 'OFF_TRACK';
  vsTargetPercentage?: number;
  avgQualityGrade?: string;
  estimatedPercentage?: number;
}

/**
 * Complete emissions summary dashboard component
 */
export function EmissionsSummary({
  monthlyData,
  ytdTotal,
  trailing12Total,
  targetValue,
  vsTargetStatus,
  vsTargetPercentage,
  avgQualityGrade,
  estimatedPercentage,
}: EmissionsSummaryProps) {
  const currentMonth = monthlyData[monthlyData.length - 1];
  
  // Calculate YTD data points
  const ytdData = monthlyData.map((point, index) => ({
    ...point,
    value: monthlyData.slice(0, index + 1).reduce((sum, p) => sum + p.value, 0),
  }));

  // Calculate trailing 12-month data (simplified)
  const trailing12Data = monthlyData.slice(-12).map((point, index, arr) => ({
    ...point,
    value: arr.slice(Math.max(0, index - 11), index + 1).reduce((sum, p) => sum + p.value, 0),
  }));

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm font-medium text-gray-600">Current Month</div>
          <div className="text-2xl font-bold text-gray-900">
            {currentMonth?.value.toFixed(1) || '—'} tCO₂e
          </div>
          {currentMonth?.quality && (
            <div className="text-sm text-gray-500">
              Grade {currentMonth.quality}
              {currentMonth.isEstimated && ' (Est.)'}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm font-medium text-gray-600">Year to Date</div>
          <div className="text-2xl font-bold text-gray-900">
            {ytdTotal.toFixed(1)} tCO₂e
          </div>
          {vsTargetStatus && (
            <StatusBadge 
              status={vsTargetStatus} 
              percentage={vsTargetPercentage}
            />
          )}
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm font-medium text-gray-600">Trailing 12 Months</div>
          <div className="text-2xl font-bold text-gray-900">
            {trailing12Total.toFixed(1)} tCO₂e
          </div>
          {avgQualityGrade && (
            <div className="text-sm text-gray-500">
              Avg Grade {avgQualityGrade}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="text-sm font-medium text-gray-600">Data Quality</div>
          <div className="text-2xl font-bold text-gray-900">
            {estimatedPercentage !== undefined 
              ? `${(100 - estimatedPercentage).toFixed(0)}%` 
              : '—'
            }
          </div>
          <div className="text-sm text-gray-500">
            Real data
            {estimatedPercentage !== undefined && estimatedPercentage > 0 && (
              <span className="text-amber-600 ml-1">
                ({estimatedPercentage.toFixed(0)}% est.)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <EmissionChart
          data={monthlyData}
          title="Monthly Emissions"
          type="monthly"
          targetValue={targetValue ? targetValue / 12 : undefined}
          showQualityIndicators={true}
        />

        <EmissionChart
          data={ytdData}
          title="Year-to-Date Cumulative"
          type="ytd"
          targetValue={targetValue}
          showQualityIndicators={false}
        />

        <EmissionChart
          data={trailing12Data}
          title="Trailing 12 Months"
          type="trailing12"
          showQualityIndicators={false}
        />
      </div>
    </div>
  );
}
