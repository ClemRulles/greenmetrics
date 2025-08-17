/**
 * Partner Dashboard v1 - Revolut-inspired ESG management interface
 */
import React from 'react';
import { motion } from 'framer-motion';
import { getDict, type Locale } from '@/i18n';
import { 
  SectionHeader, 
  KPIStatCard, 
  QualityDonut, 
  CoverageProgress,
  CertificateCard 
} from '@/components/ui';
import { variants } from '@/lib/ui/motion';

// Mock data for demonstration
const mockData = {
  kpis: [
    {
      title: 'Total Emissions',
      value: '2,847',
      unit: 't CO₂e',
      change: { value: -12.3, period: 'vs last month', trend: 'down' as const },
      sparkline: [
        { value: 3200 }, { value: 3100 }, { value: 2950 }, 
        { value: 2890 }, { value: 2847 }
      ]
    },
    {
      title: 'Suppliers Assessed',
      value: '156',
      unit: '',
      change: { value: 8.7, period: 'vs last month', trend: 'up' as const },
      sparkline: [
        { value: 140 }, { value: 145 }, { value: 148 }, 
        { value: 152 }, { value: 156 }
      ]
    },
    {
      title: 'ESG Score',
      value: '87.2',
      unit: '/100',
      change: { value: 2.1, period: 'vs last month', trend: 'up' as const },
      status: 'good' as const
    },
    {
      title: 'Active Certificates',
      value: '23',
      unit: '',
      change: { value: 4.5, period: 'vs last month', trend: 'up' as const }
    }
  ],
  
  qualityScores: [
    { label: 'Grade A', value: 45, grade: 'A' as const, color: 'var(--green)' },
    { label: 'Grade B', value: 28, grade: 'B' as const, color: 'var(--emerald)' },
    { label: 'Grade C', value: 18, grade: 'C' as const, color: 'var(--amber)' },
    { label: 'Grade D', value: 9, grade: 'D' as const, color: 'var(--red)' }
  ],
  
  coverage: [
    { label: 'Scope 1 Coverage', current: 234, target: 250, color: 'blue' as const },
    { label: 'Scope 2 Coverage', current: 189, target: 200, color: 'green' as const },
    { label: 'Scope 3 Coverage', current: 145, target: 300, color: 'amber' as const }
  ],
  
  certificates: [
    {
      id: '1',
      title: 'ISO 14001:2015',
      issuer: 'SGS',
      status: 'valid' as const,
      issuedAt: new Date('2024-01-15'),
      expiresAt: new Date('2025-01-15'),
      scope: 'Environmental Management',
      grade: 'A' as const
    },
    {
      id: '2', 
      title: 'GHG Protocol Verification',
      issuer: 'Bureau Veritas',
      status: 'pending' as const,
      issuedAt: new Date('2024-11-01'),
      scope: 'Carbon Footprint',
      grade: 'B' as const
    }
  ],
  
  suppliers: [
    { name: 'Acme Corp', score: 92, status: 'verified', emissions: 450, trend: 'down' },
    { name: 'Global Supply Co', score: 87, status: 'pending', emissions: 320, trend: 'stable' },
    { name: 'EcoTech Industries', score: 95, status: 'verified', emissions: 125, trend: 'down' },
    { name: 'Standard Materials', score: 73, status: 'review', emissions: 890, trend: 'up' }
  ]
};

export default async function PartnerDashboard({
  params
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params;
  const t = await getDict(locale, 'partner');

  return (
    <div className="min-h-screen bg-neutral-50 p-lg">
      <div className="max-w-7xl mx-auto space-y-xl">
        {/* Header */}
        <motion.div
          variants={variants.fadeIn}
          initial="hidden"
          animate="visible"
        >
          <SectionHeader
            title="Partner Dashboard"
            subtitle="Monitor your ESG performance and supplier network"
            action={
              <button className="px-lg py-sm bg-blue text-white rounded-md hover:bg-blue/90 transition-colors">
                Generate Report
              </button>
            }
            animate={false}
          />
        </motion.div>

        {/* KPI Cards Grid */}
        <motion.div
          variants={variants.staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-lg"
        >
          {mockData.kpis.map((kpi, index) => (
            <motion.div key={kpi.title} variants={variants.staggerItem}>
              <KPIStatCard
                title={kpi.title}
                value={kpi.value}
                unit={kpi.unit}
                change={kpi.change}
                sparkline={kpi.sparkline}
                status={kpi.status}
                animate={false}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl">
          {/* Quality Distribution */}
          <motion.div
            variants={variants.slideInLeft}
            initial="hidden"
            animate="visible"
            className="bg-white rounded-lg p-xl shadow-sm border border-neutral-200"
          >
            <SectionHeader
              title="Supplier Quality Distribution"
              subtitle="ESG performance grades across your supply chain"
              level={3}
              animate={false}
              className="mb-xl"
            />
            <div className="flex justify-center">
              <QualityDonut
                scores={mockData.qualityScores}
                centerContent={
                  <div className="text-center">
                    <div className="text-2xl font-bold text-neutral-900">87.2</div>
                    <div className="text-sm text-neutral-600">Avg Score</div>
                  </div>
                }
                animate={false}
              />
            </div>
          </motion.div>

          {/* Coverage Progress */}
          <motion.div
            variants={variants.slideInRight}
            initial="hidden"
            animate="visible"
            className="bg-white rounded-lg p-xl shadow-sm border border-neutral-200"
          >
            <SectionHeader
              title="Emissions Coverage"
              subtitle="Progress towards complete scope coverage"
              level={3}
              animate={false}
              className="mb-xl"
            />
            <div className="space-y-lg">
              {mockData.coverage.map((item) => (
                <CoverageProgress
                  key={item.label}
                  label={item.label}
                  current={item.current}
                  target={item.target}
                  unit=" suppliers"
                  color={item.color}
                  animate={false}
                />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Certificates Section */}
        <motion.div
          variants={variants.slideInUp}
          initial="hidden"
          animate="visible"
        >
          <SectionHeader
            title="Active Certificates"
            subtitle="Your current certifications and their status"
            action={
              <button className="text-blue hover:text-blue/80 text-sm font-medium transition-colors">
                View All
              </button>
            }
            className="mb-lg"
            animate={false}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
            {mockData.certificates.map((cert) => (
              <CertificateCard
                key={cert.id}
                certificate={cert}
                animate={false}
                onDownload={() => console.log('Download', cert.title)}
              />
            ))}
          </div>
        </motion.div>

        {/* Suppliers Table */}
        <motion.div
          variants={variants.slideInUp}
          initial="hidden"
          animate="visible"
          className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden"
        >
          <div className="p-xl">
            <SectionHeader
              title="Top Suppliers"
              subtitle="Your highest impact suppliers and their performance"
              action={
                <button className="text-blue hover:text-blue/80 text-sm font-medium transition-colors">
                  Manage Suppliers
                </button>
              }
              animate={false}
            />
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-t border-neutral-200">
                <tr>
                  <th className="px-xl py-md text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-xl py-md text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    ESG Score
                  </th>
                  <th className="px-xl py-md text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-xl py-md text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Emissions (t CO₂e)
                  </th>
                  <th className="px-xl py-md text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Trend
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {mockData.suppliers.map((supplier, index) => (
                  <tr key={supplier.name} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-xl py-lg">
                      <div className="font-medium text-neutral-900">{supplier.name}</div>
                    </td>
                    <td className="px-xl py-lg">
                      <div className="flex items-center gap-xs">
                        <span className="text-2xl font-bold text-neutral-900 tabular-nums">
                          {supplier.score}
                        </span>
                        <span className="text-neutral-600">/100</span>
                      </div>
                    </td>
                    <td className="px-xl py-lg">
                      <span className={`
                        inline-flex px-2 py-1 text-xs font-medium rounded-md
                        ${supplier.status === 'verified' ? 'bg-green/10 text-green' : 
                          supplier.status === 'pending' ? 'bg-amber/10 text-amber' :
                          'bg-red/10 text-red'}
                      `}>
                        {supplier.status}
                      </span>
                    </td>
                    <td className="px-xl py-lg text-neutral-900 font-medium tabular-nums">
                      {supplier.emissions.toLocaleString()}
                    </td>
                    <td className="px-xl py-lg">
                      <span className={`
                        ${supplier.trend === 'down' ? 'text-green' : 
                          supplier.trend === 'up' ? 'text-red' : 'text-neutral-600'}
                      `}>
                        {supplier.trend === 'down' ? '↘' : supplier.trend === 'up' ? '↗' : '→'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
