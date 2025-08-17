import { getDict, type Locale } from '@/i18n';
import Link from 'next/link';
import { simulateCost, getTierInfo } from '@/lib/sponsor/simulator';

export default async function SponsorPage({ 
  params 
}: { 
  params: Promise<{ locale: Locale }> 
}) {
  const { locale } = await params;
  const t = await getDict(locale, 'sponsor');

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
  }> = [];

  // Example cost simulation
  const exampleSimulation = simulateCost(10, 5); // 10 basic, 5 pro seats
  const tierInfo = getTierInfo(15);

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t.title}</h1>
        <Link 
          href={`/${locale}/app`}
          className="text-blue-600 hover:text-blue-800 underline"
        >
          {t.back}
        </Link>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="border rounded-lg p-4">
          <div className="text-sm text-gray-600">{t.cards.coverage}</div>
          <div className="text-2xl font-bold">{mockMetrics.coveragePct}%</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-gray-600">{t.cards.quality}</div>
          <div className="text-2xl font-bold">{mockMetrics.dataQualityScore}</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-gray-600">{t.cards.invited}</div>
          <div className="text-2xl font-bold">{mockMetrics.invited}</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-gray-600">{t.cards.active}</div>
          <div className="text-2xl font-bold">{mockMetrics.active}</div>
        </div>
      </div>

      {/* Supplier Table */}
      <div>
        <h2 className="text-lg font-medium mb-4">Supplier Coverage</h2>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                  {t.table.supplier}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                  {t.table.spendShare}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                  {t.table.status}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">
                  Data Type
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mockSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    No suppliers configured yet
                  </td>
                </tr>
              ) : (
                mockSuppliers.map((supplier, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-sm">{supplier.supplierName}</td>
                    <td className="px-4 py-3 text-sm">{(supplier.spendShare * 100).toFixed(1)}%</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        supplier.status === 'Active' 
                          ? 'bg-green-100 text-green-800'
                          : supplier.status === 'Invited'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {supplier.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        supplier.dataType === 'Primary'
                          ? 'bg-blue-100 text-blue-800'
                          : supplier.dataType === 'Estimated'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {supplier.dataType}
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
      <div>
        <h2 className="text-lg font-medium mb-4">{t.sim.title}</h2>
        <div className="border rounded-lg p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="font-medium mb-2">Example Calculation</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>{t.sim.basic} (10 × $49):</span>
                  <span>$490</span>
                </div>
                <div className="flex justify-between">
                  <span>{t.sim.pro} (5 × $99):</span>
                  <span>$495</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Subtotal:</span>
                  <span>$985</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>{t.sim.discount} ({Math.round(tierInfo.discount * 100)}%):</span>
                  <span>-${(985 * tierInfo.discount).toFixed(2)}</span>
                </div>
                <hr />
                <div className="flex justify-between font-bold">
                  <span>{t.sim.monthly}:</span>
                  <span>${exampleSimulation.monthly}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>{t.sim.annual}:</span>
                  <span>${exampleSimulation.annual}</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-2">Volume Tiers</h3>
              <div className="space-y-1 text-sm">
                <div>5-19 seats: 10% discount</div>
                <div>20-49 seats: 20% discount</div>
                <div>50-99 seats: 25% discount</div>
                <div>100+ seats: 30% discount</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
