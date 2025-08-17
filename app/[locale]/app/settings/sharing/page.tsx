import { getDict, type Locale } from '@/i18n';
import Link from 'next/link';

export default async function SharingSettingsPage({
  params
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params;
  const t = await getDict(locale, 'sharing');

  // Mock data for initial display - will be replaced with actual API calls
  const mockConsentRequests: Array<{
    id: string;
    partnerName: string;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    createdAt: Date;
  }> = [];

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t.title}</h1>
        <Link href={`/${locale}/app/settings`} className="text-blue-600 hover:text-blue-800">
          ← {t.back}
        </Link>
      </div>

      {/* Data Sharing Consent */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">{t.consent.title}</h2>
        <p className="text-sm text-gray-600 mb-6">{t.consent.description}</p>

        {mockConsentRequests.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500">{t.consent.noRequests}</div>
          </div>
        ) : (
          <div className="space-y-4">
            {mockConsentRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">{request.partnerName}</div>
                  <div className="text-sm text-gray-600">
                    {t.consent.requestedAt}: {request.createdAt.toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    request.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                    request.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {t.consent.status[request.status.toLowerCase() as keyof typeof t.consent.status]}
                  </span>
                  {request.status === 'PENDING' && (
                    <div className="flex space-x-2">
                      <button 
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        onClick={() => {
                          // Will implement consent acceptance
                          console.log('Accept consent for', request.id);
                        }}
                      >
                        {t.consent.actions.accept}
                      </button>
                      <button 
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        onClick={() => {
                          // Will implement consent rejection
                          console.log('Reject consent for', request.id);
                        }}
                      >
                        {t.consent.actions.reject}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Privacy Policy */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">{t.policy.title}</h2>
        <p className="text-sm text-gray-600">{t.policy.description}</p>
      </div>
    </main>
  );
}
