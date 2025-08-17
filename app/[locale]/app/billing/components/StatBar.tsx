import React from 'react';

export function StatBar({ used, max, label }: { used: number; max: number; label: string }) {
  const pct = Math.min(100, Math.floor((used / Math.max(1, max)) * 100));
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-gray-600">{used} / {max}</span>
      </div>
      <div className="h-2 w-full rounded bg-gray-200">
        <div 
          className="h-2 rounded bg-blue-600 transition-all duration-300" 
          style={{ width: `${pct}%` }} 
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
          aria-label={`${label}: ${used} of ${max} used`}
        />
      </div>
      <div className="text-xs text-gray-500">{pct}% used</div>
    </div>
  );
}
