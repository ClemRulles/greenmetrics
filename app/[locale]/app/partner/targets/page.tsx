'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

// Mock translation function - would integrate with next-intl
const useTranslation = () => ({
  t: (key: string) => {
    const translations: Record<string, string> = {
      'targets.title': 'Partner Targets',
      'targets.subtitle': 'Set and track your emissions reduction targets',
      'targets.coverageTarget': 'Coverage target (%)',
      'targets.coverageTargetDesc': 'Percentage of suppliers with verified data',
      'targets.dqsMin': 'Minimum data quality (A–C)',
      'targets.dqsMinDesc': 'Minimum acceptable data quality grade',
      'targets.targetTons': 'Attributed tCO₂e target',
      'targets.targetTonsDesc': 'Maximum attributed emissions in tonnes CO₂e',
      'targets.baselineYear': 'Baseline year',
      'targets.baselineYearDesc': 'Reference year for emissions comparison',
      'targets.save': 'Save targets',
      'targets.saving': 'Saving...',
      'targets.snapshot': 'Take snapshot',
      'targets.takingSnapshot': 'Creating snapshot...',
      'targets.progress.title': 'Current Progress',
      'targets.progress.coverage': 'Coverage',
      'targets.progress.quality': 'Data Quality',
      'targets.progress.emissions': 'Attributed Emissions',
      'targets.progress.status': 'Status',
      'targets.progress.onTrack': 'On track',
      'targets.progress.offTrack': 'Off track',
      'targets.progress.vs': 'vs',
      'targets.progress.target': 'target',
      'targets.progress.tons': 'tCO₂e',
      'targets.exports.title': 'Data Exports',
      'targets.exports.description': 'Download privacy-safe Scope 3 Category 1 data',
      'targets.exports.csv': 'Download CSV',
      'targets.exports.json': 'Download JSON',
      'targets.exports.downloading': 'Downloading...',
      'targets.alerts.saved': 'Targets saved successfully',
      'targets.alerts.snapshotCreated': 'Progress snapshot created',
      'targets.alerts.exportReady': 'Export downloaded successfully',
      'targets.alerts.error': 'An error occurred. Please try again.',
    };
    return translations[key] || key;
  }
});

type Targets = {
  coveragePct: number;
  dqsMin: 'A' | 'B' | 'C';
  targetTons: number;
  baselineYear: number;
};

type Progress = {
  coveragePct: number;
  dqsAvg: number;
  attributedTons: number;
  deltaTons: number;
  onTrack: boolean;
};

export default function PartnerTargetsPage() {
  const { t } = useTranslation();
  const params = useParams();
  const orgId = params?.orgId as string || 'demo-org';

  const [targets, setTargets] = useState<Targets>({
    coveragePct: 80,
    dqsMin: 'B',
    targetTons: 1000,
    baselineYear: new Date().getFullYear() - 1
  });

  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [takingSnapshot, setTakingSnapshot] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load initial targets and progress
  useEffect(() => {
    loadTargets();
    loadProgress();
  }, [orgId]);

  const loadTargets = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/partner/${orgId}/targets`);
      if (response.ok) {
        const data = await response.json();
        if (data.targets) {
          setTargets(data.targets);
        }
      }
    } catch (err) {
      console.error('Failed to load targets:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProgress = async () => {
    // Mock progress data - would integrate with actual progress calculation
    setProgress({
      coveragePct: 75.5,
      dqsAvg: 0.8,
      attributedTons: 850.5,
      deltaTons: -149.5,
      onTrack: true
    });
  };

  const saveTargets = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await fetch(`/api/partner/${orgId}/targets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targets)
      });

      if (response.ok) {
        setMessage(t('targets.alerts.saved'));
        loadProgress(); // Refresh progress after saving targets
      } else {
        const data = await response.json();
        setError(data.error || t('targets.alerts.error'));
      }
    } catch (err) {
      setError(t('targets.alerts.error'));
    } finally {
      setSaving(false);
    }
  };

  const takeSnapshot = async () => {
    try {
      setTakingSnapshot(true);
      setError(null);
      
      const response = await fetch(`/api/partner/${orgId}/targets/snapshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: new Date().getFullYear() })
      });

      if (response.ok) {
        setMessage(t('targets.alerts.snapshotCreated'));
      } else {
        const data = await response.json();
        setError(data.error || t('targets.alerts.error'));
      }
    } catch (err) {
      setError(t('targets.alerts.error'));
    } finally {
      setTakingSnapshot(false);
    }
  };

  const downloadExport = async (format: 'csv' | 'json') => {
    try {
      setError(null);
      const year = new Date().getFullYear();
      const response = await fetch(`/api/partner/${orgId}/exports/scope3.${format}?year=${year}`);
      
      if (response.ok) {
        if (format === 'csv') {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `scope3_cat1_${orgId}_${year}.csv`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } else {
          const data = await response.json();
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `scope3_cat1_${orgId}_${year}.json`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
        setMessage(t('targets.alerts.exportReady'));
      } else {
        const data = await response.json();
        setError(data.error || t('targets.alerts.error'));
      }
    } catch (err) {
      setError(t('targets.alerts.error'));
    }
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (message || error) {
      const timer = setTimeout(() => {
        setMessage(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message, error]);

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('targets.title')}</h1>
        <p className="text-gray-600 mt-2">{t('targets.subtitle')}</p>
      </div>

      {/* Alerts */}
      {message && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md">
          {message}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Targets Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Set Targets</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="coveragePct" className="block text-sm font-medium text-gray-700 mb-1">
                {t('targets.coverageTarget')}
              </label>
              <input
                type="number"
                id="coveragePct"
                min="0"
                max="100"
                value={targets.coveragePct}
                onChange={(e) => setTargets(prev => ({ ...prev, coveragePct: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">{t('targets.coverageTargetDesc')}</p>
            </div>

            <div>
              <label htmlFor="dqsMin" className="block text-sm font-medium text-gray-700 mb-1">
                {t('targets.dqsMin')}
              </label>
              <select
                id="dqsMin"
                value={targets.dqsMin}
                onChange={(e) => setTargets(prev => ({ ...prev, dqsMin: e.target.value as 'A' | 'B' | 'C' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="A">A - Excellent</option>
                <option value="B">B - Good</option>
                <option value="C">C - Acceptable</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">{t('targets.dqsMinDesc')}</p>
            </div>

            <div>
              <label htmlFor="targetTons" className="block text-sm font-medium text-gray-700 mb-1">
                {t('targets.targetTons')}
              </label>
              <input
                type="number"
                id="targetTons"
                min="0"
                step="0.1"
                value={targets.targetTons}
                onChange={(e) => setTargets(prev => ({ ...prev, targetTons: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">{t('targets.targetTonsDesc')}</p>
            </div>

            <div>
              <label htmlFor="baselineYear" className="block text-sm font-medium text-gray-700 mb-1">
                {t('targets.baselineYear')}
              </label>
              <input
                type="number"
                id="baselineYear"
                min="2000"
                max={new Date().getFullYear()}
                value={targets.baselineYear}
                onChange={(e) => setTargets(prev => ({ ...prev, baselineYear: parseInt(e.target.value) || 2023 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">{t('targets.baselineYearDesc')}</p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={saveTargets}
                disabled={saving}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? t('targets.saving') : t('targets.save')}
              </button>
              
              <button
                onClick={takeSnapshot}
                disabled={takingSnapshot}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {takingSnapshot ? t('targets.takingSnapshot') : t('targets.snapshot')}
              </button>
            </div>
          </div>
        </div>

        {/* Progress Display */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">{t('targets.progress.title')}</h2>
          
          {progress ? (
            <div className="space-y-4">
              {/* Coverage Progress */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">{t('targets.progress.coverage')}</span>
                  <span className="text-sm text-gray-600">
                    {progress.coveragePct.toFixed(1)}% {t('targets.progress.vs')} {targets.coveragePct}% {t('targets.progress.target')}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${progress.coveragePct >= targets.coveragePct ? 'bg-green-500' : 'bg-yellow-500'}`}
                    style={{ width: `${Math.min(100, (progress.coveragePct / targets.coveragePct) * 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Quality Progress */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">{t('targets.progress.quality')}</span>
                  <span className="text-sm text-gray-600">
                    {(progress.dqsAvg * 100).toFixed(0)}% {t('targets.progress.vs')} {targets.dqsMin} {t('targets.progress.target')}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${progress.dqsAvg >= (targets.dqsMin === 'A' ? 0.9 : targets.dqsMin === 'B' ? 0.7 : 0.5) ? 'bg-green-500' : 'bg-yellow-500'}`}
                    style={{ width: `${progress.dqsAvg * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Emissions Progress */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">{t('targets.progress.emissions')}</span>
                  <span className="text-sm text-gray-600">
                    {progress.attributedTons.toFixed(1)} {t('targets.progress.vs')} {targets.targetTons} {t('targets.progress.tons')} {t('targets.progress.target')}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${progress.attributedTons <= targets.targetTons ? 'bg-green-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(100, (progress.attributedTons / targets.targetTons) * 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Status */}
              <div className="pt-4 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{t('targets.progress.status')}:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    progress.onTrack 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {progress.onTrack ? t('targets.progress.onTrack') : t('targets.progress.offTrack')}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-500">
              Loading progress data...
            </div>
          )}
        </div>
      </div>

      {/* Data Exports */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-2">{t('targets.exports.title')}</h2>
        <p className="text-gray-600 mb-4">{t('targets.exports.description')}</p>
        
        <div className="flex gap-4">
          <button
            onClick={() => downloadExport('csv')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            {t('targets.exports.csv')}
          </button>
          
          <button
            onClick={() => downloadExport('json')}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            {t('targets.exports.json')}
          </button>
        </div>
      </div>
    </main>
  );
}
