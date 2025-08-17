import { getDict, type Locale } from '@/i18n';
import Link from 'next/link';
import { simulateCost, getTierInfo } from '@/lib/partner/simulator';

export default async function PartnerPage({
  params
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params;
  const t = await getDict(locale, 'partner');

  // Mock data for initial display - will be replaced with actual API calls
  const mockMetrics = {
    invited: 0,
    active: 0,
    coveragePct: 0,
    primaryData: 0,
    estimatedData: 0,
    dataQualityScore: 0
  };

  const mockSuppliers: Array<{
    supplierName: string;
    spendShare: number;
    status: string;
    dataType: string;
    visibility: string;
  }> = [];

  // Example cost simulation
  const exampleSimulation = simulateCost(10, 5); // 10 basic, 5 pro seats
  const tierInfo = getTierInfo(15);

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t.title}</h1>
        <Link href={`/${locale}/app`} className="text-blue-600 hover:text-blue-800">
          ← {t.back}
        </Link>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white border rounded-lg">
          <div className="text-2xl font-bold">{mockMetrics.coveragePct}%</div>
          <div className="text-sm text-gray-600">{t.cards.coverage}</div>
        </div>
        <div className="p-4 bg-white border rounded-lg">
          <div className="text-2xl font-bold">{mockMetrics.dataQualityScore}</div>
          <div className="text-sm text-gray-600">{t.cards.quality}</div>
        </div>
        <div className="p-4 bg-white border rounded-lg">
          <div className="text-2xl font-bold">{mockMetrics.invited}</div>
          <div className="text-sm text-gray-600">{t.cards.invited}</div>
        </div>
        <div className="p-4 bg-white border rounded-lg">
          <div className="text-2xl font-bold">{mockMetrics.active}</div>
          <div className="text-sm text-gray-600">{t.cards.active}</div>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-lg font-medium">Suppliers</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">{t.table.supplier}</th>
                <th className="px-4 py-2 text-left">{t.table.spendShare}</th>
                <th className="px-4 py-2 text-left">{t.table.status}</th>
                <th className="px-4 py-2 text-left">Data Type</th>
                <th className="px-4 py-2 text-left">{t.table.visibility}</th>
              </tr>
            </thead>
            <tbody>
              {mockSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No suppliers configured yet
                  </td>
                </tr>
              ) : (
                mockSuppliers.map((supplier, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-2">{supplier.supplierName}</td>
                    <td className="px-4 py-2">{(supplier.spendShare * 100).toFixed(1)}%</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        supplier.status === 'Active' ? 'bg-green-100 text-green-800' :
                        supplier.status === 'Invited' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {supplier.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">{supplier.dataType}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        supplier.visibility === 'DETAILED' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {supplier.visibility}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cost Simulator */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">{t.sim.title}</h2>
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            Example: {exampleSimulation.seats} seats total
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium">Monthly</div>
              <div className="text-lg">${exampleSimulation.monthly}</div>
            </div>
            <div>
              <div className="text-sm font-medium">Annual</div>
              <div className="text-lg">${exampleSimulation.annual}</div>
            </div>
          </div>
          {exampleSimulation.discount > 0 && (
            <div className="text-sm text-green-600">
              {tierInfo.description}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
