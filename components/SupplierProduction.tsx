'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface ProductionStat {
  id: string;
  year: number;
  units: number;
  unitLabel: string;
  updatedAt: string;
}

interface Certificate {
  id: string;
  certificateHash: string;
  organizationId: string;
  year: number;
  totalVolume: number;
  issuedAt: string;
}

interface SupplierProductionProps {
  organizationId: string;
  organizationName: string;
}

export default function SupplierProduction({ organizationId, organizationName }: SupplierProductionProps) {
  const { data: session } = useSession();
  const [productionStats, setProductionStats] = useState<ProductionStat[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [issuingCert, setIssuingCert] = useState(false);
  const [currentYear] = useState(new Date().getFullYear());
  
  // Form state for new production entry
  const [formData, setFormData] = useState({
    year: currentYear,
    units: '',
    unitLabel: 'tons'
  });

  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load existing data
  useEffect(() => {
    loadData();
  }, [organizationId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load production stats
      const productionRes = await fetch(`/api/supplier/production?organizationId=${organizationId}`);
      if (productionRes.ok) {
        const productionData = await productionRes.json();
        setProductionStats(productionData.productionStats || []);
      }

      // Load certificates
      const certRes = await fetch(`/api/certificate?organizationId=${organizationId}`);
      if (certRes.ok) {
        const certData = await certRes.json();
        setCertificates(certData.certificates || []);
      }

    } catch (error) {
      console.error('Failed to load data:', error);
      setAlert({ type: 'error', message: 'Failed to load production data' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.units || isNaN(Number(formData.units))) {
      setAlert({ type: 'error', message: 'Please enter valid production units' });
      return;
    }

    try {
      setSaving(true);
      
      const response = await fetch('/api/supplier/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          year: formData.year,
          units: Number(formData.units),
          unitLabel: formData.unitLabel
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save production data');
      }

      setAlert({ type: 'success', message: 'Production data saved successfully' });
      setFormData({ year: currentYear, units: '', unitLabel: 'tons' });
      await loadData(); // Reload data

    } catch (error) {
      console.error('Save error:', error);
      setAlert({ type: 'error', message: 'Failed to save production data' });
    } finally {
      setSaving(false);
    }
  };

  const handleIssueCertificate = async (year: number) => {
    try {
      setIssuingCert(true);
      
      const response = await fetch('/api/certificate/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          year
        })
      });

      if (!response.ok) {
        throw new Error('Failed to issue certificate');
      }

      const result = await response.json();
      setAlert({ 
        type: 'success', 
        message: `Certificate issued successfully: ${result.certificate.certificateHash}` 
      });
      await loadData(); // Reload to show new certificate

    } catch (error) {
      console.error('Certificate issue error:', error);
      setAlert({ type: 'error', message: 'Failed to issue certificate' });
    } finally {
      setIssuingCert(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">Loading production data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Production & Certificates</h1>
        <div className="text-sm text-gray-600">
          Organization: {organizationName}
        </div>
      </div>

      {alert && (
        <div className={`p-4 rounded-lg border ${
          alert.type === 'error' 
            ? 'border-red-200 bg-red-50 text-red-800' 
            : 'border-green-200 bg-green-50 text-green-800'
        }`}>
          {alert.message}
        </div>
      )}

      {/* Add/Edit Production Stats */}
      <div className="border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Add Production Data</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="year" className="block text-sm font-medium mb-1">Year</label>
              <input
                id="year"
                type="number"
                min="2000"
                max="2100"
                value={formData.year}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="units" className="block text-sm font-medium mb-1">Production Volume</label>
              <input
                id="units"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g., 1500"
                value={formData.units}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setFormData(prev => ({ ...prev, units: e.target.value }))
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="unitLabel" className="block text-sm font-medium mb-1">Unit</label>
              <input
                id="unitLabel"
                placeholder="e.g., tons, kg, units"
                value={formData.unitLabel}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setFormData(prev => ({ ...prev, unitLabel: e.target.value }))
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <button 
            type="submit" 
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Production Data'}
          </button>
        </form>
      </div>

      {/* Production History & Certificates */}
      <div className="border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Production History & Certificates</h2>
        {productionStats.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No production data recorded yet. Add your first entry above.
          </div>
        ) : (
          <div className="space-y-4">
            {productionStats.map((stat) => {
              const certificate = certificates.find(c => c.year === stat.year);
              
              return (
                <div key={stat.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">
                      {stat.year}: {stat.units.toLocaleString()} {stat.unitLabel}
                    </div>
                    <div className="text-sm text-gray-600">
                      Last updated: {new Date(stat.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {certificate ? (
                      <div className="flex items-center space-x-2">
                        <span className="text-green-600">✓ Certified</span>
                        <button
                          onClick={() => window.open(`/certificate/${certificate.certificateHash}`, '_blank')}
                          className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                        >
                          View Certificate
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleIssueCertificate(stat.year)}
                        disabled={issuingCert}
                        className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        {issuingCert ? 'Issuing...' : 'Issue Certificate'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Certificates Summary */}
      {certificates.length > 0 && (
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Certificate Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {certificates.map((cert) => (
              <div key={cert.id} className="p-4 border rounded-lg">
                <div className="font-medium">{cert.year} Certificate</div>
                <div className="text-sm text-gray-600">
                  Volume: {cert.totalVolume.toLocaleString()} units
                </div>
                <div className="text-sm text-gray-600">
                  Issued: {new Date(cert.issuedAt).toLocaleDateString()}
                </div>
                <div className="text-xs text-gray-500 font-mono mt-2 break-all">
                  {cert.certificateHash}
                </div>
                <button
                  onClick={() => window.open(`/certificate/${cert.certificateHash}`, '_blank')}
                  className="mt-2 w-full px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                >
                  View Public Certificate
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
