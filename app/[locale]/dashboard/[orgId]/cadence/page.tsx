'use client';

import { useState, useEffect } from 'react';
import { EmissionsSummary, ChartDataPoint } from '@/components/charts/EmissionChart';

interface DashboardData {
  organizationId: string;
  period: string;
  timestamp: string;
  summary: {
    currentMonth: {
      emissions: number;
      quality: 'A' | 'B' | 'C';
      isEstimated: boolean;
    };
    ytd: {
      emissions: number;
      vsTarget?: {
        percentage: number;
        status: 'OK' | 'WATCH' | 'OFF_TRACK';
      };
    };
    trailing12: {
      emissions: number;
    };
    dataQuality: {
      avgGrade: string;
      realDataPercentage: number;
      estimatedPercentage: number;
    };
  };
  chartData: {
    monthly: ChartDataPoint[];
    ytd: ChartDataPoint[];
    trailing12: ChartDataPoint[];
  };
  targets: {
    emissionsTarget: number;
    coverageTarget: number;
    qualityMinimum: string;
    baselineYear: number;
  } | null;
}

interface CadenceEnginePageProps {
  params: {
    orgId: string;
    locale: string;
  };
}

export default function CadenceEnginePage({ params }: CadenceEnginePageProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'6m' | '12m' | 'ytd' | 'all'>('12m');
  const [includeEstimates, setIncludeEstimates] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [params.orgId, period, includeEstimates]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `/api/dashboard/${params.orgId}?period=${period}&includeEstimates=${includeEstimates}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data: ${response.statusText}`);
      }
      
      const dashboardData = await response.json();
      setData(dashboardData);
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const triggerMonthlyClose = async () => {
    try {
      const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM format
      
      const response = await fetch('/api/jobs/cadence/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret: 'dev-secret', // In production, this would be from environment
          jobType: 'monthly_close',
          monthPeriod: currentPeriod,
          organizationId: params.orgId,
          force: false,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to trigger monthly close');
      }
      
      const result = await response.json();
      console.log('Monthly close triggered:', result);
      
      // Refresh data
      setTimeout(() => fetchDashboardData(), 2000);
      
    } catch (err) {
      console.error('Error triggering monthly close:', err);
    }
  };

  const triggerBackfill = async () => {
    try {
      const currentPeriod = new Date().toISOString().slice(0, 7);
      
      const response = await fetch('/api/jobs/cadence/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret: 'dev-secret',
          jobType: 'backfill',
          monthPeriod: currentPeriod,
          organizationId: params.orgId,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to trigger backfill');
      }
      
      const result = await response.json();
      console.log('Backfill triggered:', result);
      
      // Refresh data
      setTimeout(() => fetchDashboardData(), 2000);
      
    } catch (err) {
      console.error('Error triggering backfill:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading emissions dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">No dashboard data available.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Monthly Cadence Engine</h1>
                <p className="text-gray-600 mt-1">
                  Automated monthly close, Grade-C estimates, backfill & dashboard graphs
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={triggerMonthlyClose}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Run Monthly Close
                </button>
                <button
                  onClick={triggerBackfill}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  Run Backfill
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg border p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Period:</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value="6m">Last 6 months</option>
                <option value="12m">Last 12 months</option>
                <option value="ytd">Year to date</option>
                <option value="all">All time</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={includeEstimates}
                  onChange={(e) => setIncludeEstimates(e.target.checked)}
                  className="mr-1"
                />
                Include estimates
              </label>
            </div>
            
            <div className="text-xs text-gray-500 ml-auto">
              Last updated: {new Date(data.timestamp).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Dashboard */}
        <EmissionsSummary
          monthlyData={data.chartData.monthly}
          ytdTotal={data.summary.ytd.emissions}
          trailing12Total={data.summary.trailing12.emissions}
          targetValue={data.targets?.emissionsTarget}
          vsTargetStatus={data.summary.ytd.vsTarget?.status}
          vsTargetPercentage={data.summary.ytd.vsTarget?.percentage}
          avgQualityGrade={data.summary.dataQuality.avgGrade}
          estimatedPercentage={data.summary.dataQuality.estimatedPercentage}
        />

        {/* Additional Info */}
        <div className="mt-8 bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cadence Engine Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Current Month Quality:</span>
              <div className="mt-1">
                Grade {data.summary.currentMonth.quality}
                {data.summary.currentMonth.isEstimated && (
                  <span className="ml-2 text-amber-600">(Estimated)</span>
                )}
              </div>
            </div>
            
            <div>
              <span className="font-medium text-gray-700">Data Completeness:</span>
              <div className="mt-1">
                {data.summary.dataQuality.realDataPercentage.toFixed(0)}% real data
                {data.summary.dataQuality.estimatedPercentage > 0 && (
                  <span className="text-gray-500">
                    , {data.summary.dataQuality.estimatedPercentage.toFixed(0)}% estimated
                  </span>
                )}
              </div>
            </div>
            
            {data.targets && (
              <div>
                <span className="font-medium text-gray-700">Annual Target:</span>
                <div className="mt-1">
                  {data.targets.emissionsTarget.toFixed(0)} tCO₂e
                  <span className="text-gray-500 ml-1">
                    (baseline: {data.targets.baselineYear})
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4 text-sm">
          <h4 className="font-semibold text-blue-900 mb-2">How it works:</h4>
          <ul className="space-y-1 text-blue-800">
            <li><strong>Monthly Close (M+5):</strong> Automatically marks missing periods as Grade C with secondary factors/heuristics</li>
            <li><strong>Backfill:</strong> When real documents arrive, replaces Grade C with primary data and regenerates affected computations</li>
            <li><strong>Quality Grades:</strong> A (exact + proofs), B (site + reliable), C (estimated/missing)</li>
            <li><strong>Dashboard Graphs:</strong> Monthly series, YTD cumulative, trailing 12 months with target badges</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
