import type { Metadata, ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { hmacVerify } from '@/lib/certificates/signature';
import { generateWeakETag, hasMatchingETag, createCacheHeaders } from '@/lib/http/etag';
import QRCodeGenerator from '@/components/QRCodeGenerator';
import { CopyToClipboard } from '@/components/CopyToClipboard';
import { DownloadQrButton } from '@/components/DownloadQrButton';

// ISR configuration - revalidate every hour
export const revalidate = 3600;

type Params = { publicId: string };

interface CertificatePageProps {
  params: Promise<Params>;
}

export async function generateMetadata(
  { params }: CertificatePageProps,
  _parent: ResolvingMetadata
): Promise<Metadata> {
  const { publicId } = await params;
  
  // Fetch certificate for metadata
  const cert = await prisma.certificate.findUnique({ 
    where: { publicId },
    include: {
      supplier: {
        select: { name: true }
      }
    }
  });
  
  const valid = !!cert && !cert.revokedAt && hmacVerify(cert);
  const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
  const url = `${baseUrl}/certificate/${publicId}`;

  const title = valid
    ? `Supplier Certificate (Scopes 1–2) • ${new Date(cert!.periodEnd).getUTCFullYear()}`
    : 'Certificate not valid';
    
  const description = valid
    ? `Scope 1: ${Math.round(Number(cert!.scope1Kg))} kg • Scope 2 MB: ${Math.round(Number(cert!.scope2MBKg))} kg • Intensity: ${Number(cert!.intensityPerUnitKg).toFixed(3)} kg/${cert!.unitLabel}`
    : 'This certificate is revoked or invalid.';

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      images: [{ url: `${url}/opengraph-image` }]
    },
    twitter: { 
      card: 'summary_large_image', 
      title, 
      description 
    },
    robots: {
      index: valid,
      follow: valid,
      noarchive: !valid,
      nosnippet: !valid
    }
  };
}

async function getCertificateData(publicId: string) {
  try {
    const cert = await prisma.certificate.findUnique({
      where: { publicId },
      include: {
        supplier: {
          select: { name: true }
        }
      }
    });
    
    if (!cert) return null;
    
    const valid = !cert.revokedAt && hmacVerify(cert);
    return { certificate: cert, valid };
  } catch (error) {
    console.error('Error fetching certificate:', error);
    return null;
  }
}

export default async function CertificateVerificationPage({ params }: CertificatePageProps) {
  const { publicId } = await params;
  const data = await getCertificateData(publicId);
  
  if (!data || !data.certificate) {
    notFound();
  }
  
  const { certificate: cert, valid } = data;
  
  // Generate ETag for caching based on certificate data
  const etag = generateWeakETag(JSON.stringify({
    publicId: cert.publicId,
    issuedAt: cert.issuedAt,
    revokedAt: cert.revokedAt,
    valid
  }));
  
  // Check if client has matching ETag
  const headersList = await headers();
  const ifNoneMatch = headersList.get('if-none-match');
  
  // Set cache headers (done in middleware or here)
  // Note: In App Router, we can't directly set response headers in page components
  // This would typically be handled by middleware or API routes
  
  const issuedDate = new Date(cert.issuedAt);
  const periodStart = new Date(cert.periodStart);
  const periodEnd = new Date(cert.periodEnd);
  
  // Generate the full URL for QR code and sharing
  const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
  const publicUrl = `${baseUrl}/certificate/${publicId}`;
  
  if (!valid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <header className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Certificate Not Valid
            </h1>
            <p className="text-lg text-gray-600">
              This certificate has been revoked or is invalid
            </p>
          </header>
          
          <div className="bg-white shadow-xl rounded-xl p-8 border border-red-200">
            <div className="text-center">
              <p className="text-gray-700 mb-4">
                Certificate ID: <span className="font-mono text-sm">{publicId}</span>
              </p>
              {cert.revokedAt && (
                <p className="text-red-600 text-sm">
                  Revoked on: {new Date(cert.revokedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8 print:py-4">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 print:px-0">
        <header className="text-center mb-6 print:mb-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4 print:hidden">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 print:text-xl">
            Supplier Emissions Certificate — Scopes 1–2
          </h1>
          <p className="text-sm text-gray-600 print:text-xs">
            Public verification page (no invoices stored or shown)
          </p>
        </header>

        <main>
          {/* Summary Section */}
          <section aria-labelledby="summary" className="mb-6 print:mb-4">
            <div className="bg-white shadow-xl rounded-xl p-6 print:shadow-none print:rounded-none print:p-4 border border-gray-200 print:border-gray-400">
              <h2 id="summary" className="text-xl font-medium text-gray-900 mb-4 print:text-lg">
                Certificate Summary
              </h2>
              
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:gap-2">
                <div className="bg-gray-50 p-3 rounded-lg print:bg-white print:rounded-none print:p-2 print:border-b">
                  <dt className="text-sm text-gray-600 print:text-xs">Organization</dt>
                  <dd className="text-base font-medium text-gray-900 print:text-sm">
                    {cert.supplier?.name || 'Unknown Organization'}
                  </dd>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg print:bg-white print:rounded-none print:p-2 print:border-b">
                  <dt className="text-sm text-gray-600 print:text-xs">Reporting Period</dt>
                  <dd className="text-base font-medium text-gray-900 print:text-sm">
                    {periodStart.toLocaleDateString()} → {periodEnd.toLocaleDateString()}
                  </dd>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg print:bg-white print:rounded-none print:p-2 print:border-b">
                  <dt className="text-sm text-gray-600 print:text-xs">Quality Grade</dt>
                  <dd className="text-base font-medium text-gray-900 print:text-sm">
                    Grade {cert.qualityGrade}
                  </dd>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg print:bg-white print:rounded-none print:p-2 print:border-b">
                  <dt className="text-sm text-gray-600 print:text-xs">Intensity</dt>
                  <dd className="text-base font-medium text-gray-900 print:text-sm">
                    {Number(cert.intensityPerUnitKg).toFixed(3)} kg CO₂e/{cert.unitLabel}
                  </dd>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg print:bg-white print:rounded-none print:p-2 print:border-b">
                  <dt className="text-sm text-gray-600 print:text-xs">Factors Version</dt>
                  <dd className="text-base font-medium text-gray-900 print:text-sm">
                    {cert.factorsVersion}
                  </dd>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg print:bg-white print:rounded-none print:p-2 print:border-b">
                  <dt className="text-sm text-gray-600 print:text-xs">Issued</dt>
                  <dd className="text-base font-medium text-gray-900 print:text-sm">
                    {issuedDate.toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          {/* QR Code and Actions Section */}
          <section aria-labelledby="verification" className="mb-6 print:mb-3">
            <div className="bg-white shadow-xl rounded-xl p-6 print:shadow-none print:rounded-none print:p-4 border border-gray-200 print:border-gray-400">
              <h2 id="verification" className="text-xl font-medium text-gray-900 mb-4 print:text-lg">
                Verification & Sharing
              </h2>
              
              <div className="flex flex-col sm:flex-row items-center gap-6 print:gap-3">
                <div className="flex-shrink-0">
                  <QRCodeGenerator 
                    data={publicUrl}
                    size={160}
                    className="border rounded-lg print:h-24 print:w-24"
                  />
                </div>
                
                <div className="flex-1 space-y-3 print:space-y-2">
                  <p className="text-sm text-gray-600 print:text-xs">
                    Scan QR code or use the link below to verify this certificate from any device
                  </p>
                  
                  <div className="flex flex-wrap gap-2 print:hidden">
                    <CopyToClipboard value={publicUrl} />
                    <DownloadQrButton dataUrl={cert.qrCode} />
                    <button 
                      className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      onClick={() => window.print()}
                      aria-label="Print this certificate"
                    >
                      Print Certificate
                    </button>
                  </div>
                  
                  <div className="text-xs text-gray-500 break-all print:text-[10px]">
                    {publicUrl}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Emissions Section */}
          <section aria-labelledby="emissions" className="mb-6 print:mb-3">
            <div className="bg-white shadow-xl rounded-xl p-6 print:shadow-none print:rounded-none print:p-4 border border-gray-200 print:border-gray-400">
              <h2 id="emissions" className="text-xl font-medium text-gray-900 mb-4 print:text-lg">
                Emissions Breakdown
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:gap-2">
                <div className="border border-blue-200 rounded-lg p-4 print:rounded-none print:p-2 bg-blue-50 print:bg-white">
                  <div className="text-sm text-blue-700 font-medium print:text-xs">Scope 1</div>
                  <div className="text-lg font-bold text-blue-900 print:text-sm">
                    {Math.round(Number(cert.scope1Kg))} kg CO₂e
                  </div>
                </div>
                
                <div className="border border-green-200 rounded-lg p-4 print:rounded-none print:p-2 bg-green-50 print:bg-white">
                  <div className="text-sm text-green-700 font-medium print:text-xs">Scope 2 (LB)</div>
                  <div className="text-lg font-bold text-green-900 print:text-sm">
                    {Math.round(Number(cert.scope2LBKg))} kg CO₂e
                  </div>
                </div>
                
                <div className="border border-purple-200 rounded-lg p-4 print:rounded-none print:p-2 bg-purple-50 print:bg-white">
                  <div className="text-sm text-purple-700 font-medium print:text-xs">Scope 2 (MB)</div>
                  <div className="text-lg font-bold text-purple-900 print:text-sm">
                    {Math.round(Number(cert.scope2MBKg))} kg CO₂e
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-gray-100 print:bg-white print:p-2 rounded-lg print:rounded-none border print:border-gray-300">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 print:text-xs">Total Emissions:</span>
                  <span className="text-lg font-bold text-gray-900 print:text-sm">
                    {Math.round(Number(cert.scope1Kg) + Number(cert.scope2LBKg) + Number(cert.scope2MBKg))} kg CO₂e
                  </span>
                </div>
              </div>
              
              <p className="mt-2 text-xs text-gray-500 print:text-[10px]">
                LB/MB = Location-based/Market-based methods. Values are cryptographically signed.
              </p>
            </div>
          </section>

          {/* Verification Details */}
          <section aria-labelledby="verification-details" className="print:hidden">
            <div className="bg-white shadow-xl rounded-xl p-6 border border-gray-200">
              <h2 id="verification-details" className="text-xl font-medium text-gray-900 mb-4">
                Technical Verification
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Cryptographically Verified</p>
                    <p className="text-xs text-gray-600">HMAC-SHA256 signature validated</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Tamper-Proof</p>
                    <p className="text-xs text-gray-600">Data integrity guaranteed</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Issued</p>
                    <p className="text-xs text-gray-600">
                      {issuedDate.toLocaleDateString()} at {issuedDate.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="text-center mt-8 print:mt-4 text-sm text-gray-500 print:text-xs">
          <p>
            This certificate was generated and verified using cryptographic signatures.
            <br className="print:hidden" />
            For questions about this certificate, please contact the issuing organization.
          </p>
        </footer>
      </div>

    </div>
  );
}
