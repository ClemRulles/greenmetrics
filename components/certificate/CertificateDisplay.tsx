'use client';
import QRCodeGenerator from '@/components/QRCodeGenerator';
import { CopyToClipboard } from '@/components/CopyToClipboard';
import { DownloadQrButton } from '@/components/DownloadQrButton';

interface CertificateDisplayProps {
  certificate: {
    publicId: string;
    organizationName: string;
    contactName: string;
    contactEmail: string;
    facilityName: string;
    facilityAddress: string;
    reportingPeriodStart: string;
    reportingPeriodEnd: string;
    totalEmissions: number;
    verificationDate: string;
    issueDate: string;
    expiryDate: string;
    scope1Direct: number;
    scope2Indirect: number;
    scope3Upstream: number;
    scope3Downstream: number;
    certifiedByName?: string;
    certifiedByTitle?: string;
    certifiedByOrganization?: string;
    verificationStandard?: string;
    verificationScope?: string;
    assuranceLevel?: string;
    qualityGrade?: string;
    coveragePercentage?: number;
    coverageDescription?: string;
    methodologyDescription?: string;
    keyAssumptions?: string;
    excludedEmissions?: string;
    totalFootprint?: number;
    totalAttributed?: number;
    notes?: string;
  };
  verificationUrl: string;
  isExpired: boolean;
  domain: string;
}

export default function CertificateDisplay({ 
  certificate, 
  verificationUrl, 
  isExpired, 
  domain 
}: CertificateDisplayProps) {
  return (
    <div className="certificate-container min-h-screen bg-gradient-to-b from-emerald-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto bg-white shadow-2xl rounded-lg overflow-hidden">
        {/* Header with organization branding */}
        <div className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Carbon Footprint Certificate</h1>
              <p className="text-emerald-100 text-lg">Verified Environmental Impact Assessment</p>
            </div>
            <div className="text-right">
              <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
                <QRCodeGenerator 
                  data={verificationUrl} 
                  size={80} 
                  className="mx-auto mb-2" 
                />
                <p className="text-xs text-emerald-100">Scan to verify</p>
              </div>
            </div>
          </div>
        </div>

        {/* Certificate body */}
        <div className="p-8 space-y-8">
          {/* Organization Information */}
          <section className="border-b border-gray-200 pb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Organization Details</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Organization</h3>
                <p className="text-gray-900 text-lg">{certificate.organizationName}</p>
                <p className="text-gray-600">{certificate.contactName}</p>
                <p className="text-gray-600">{certificate.contactEmail}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Facility</h3>
                <p className="text-gray-900 text-lg">{certificate.facilityName}</p>
                <p className="text-gray-600">{certificate.facilityAddress}</p>
              </div>
            </div>
          </section>

          {/* Reporting Period */}
          <section className="border-b border-gray-200 pb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Reporting Period</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700">
                <span className="font-semibold">From:</span> {new Date(certificate.reportingPeriodStart).toLocaleDateString()}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">To:</span> {new Date(certificate.reportingPeriodEnd).toLocaleDateString()}
              </p>
            </div>
          </section>

          {/* Emissions Summary */}
          <section className="border-b border-gray-200 pb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Carbon Footprint Summary</h2>
            
            <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg p-6 mb-6">
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Total Emissions</p>
                <p className="text-4xl font-bold text-emerald-600 mb-2">
                  {certificate.totalEmissions.toLocaleString()} tCO₂e
                </p>
                {certificate.totalFootprint && (
                  <p className="text-gray-600">
                    Total Footprint: {certificate.totalFootprint.toLocaleString()} tCO₂e
                  </p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <h4 className="font-semibold text-red-800 mb-2">Scope 1</h4>
                <p className="text-2xl font-bold text-red-600">{certificate.scope1Direct.toLocaleString()}</p>
                <p className="text-sm text-red-700">tCO₂e Direct</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 text-center">
                <h4 className="font-semibold text-orange-800 mb-2">Scope 2</h4>
                <p className="text-2xl font-bold text-orange-600">{certificate.scope2Indirect.toLocaleString()}</p>
                <p className="text-sm text-orange-700">tCO₂e Indirect</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <h4 className="font-semibold text-blue-800 mb-2">Scope 3 Up</h4>
                <p className="text-2xl font-bold text-blue-600">{certificate.scope3Upstream.toLocaleString()}</p>
                <p className="text-sm text-blue-700">tCO₂e Upstream</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <h4 className="font-semibold text-purple-800 mb-2">Scope 3 Down</h4>
                <p className="text-2xl font-bold text-purple-600">{certificate.scope3Downstream.toLocaleString()}</p>
                <p className="text-sm text-purple-700">tCO₂e Downstream</p>
              </div>
            </div>
          </section>

          {/* Verification Details */}
          <section className="border-b border-gray-200 pb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Verification & Quality</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Certificate Details</h3>
                <p><span className="font-medium">Certificate ID:</span> {certificate.publicId}</p>
                <p><span className="font-medium">Issue Date:</span> {new Date(certificate.issueDate).toLocaleDateString()}</p>
                <p><span className="font-medium">Expiry Date:</span> {new Date(certificate.expiryDate).toLocaleDateString()}</p>
                <p><span className="font-medium">Verification Date:</span> {new Date(certificate.verificationDate).toLocaleDateString()}</p>
                {isExpired && (
                  <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded text-red-800 text-sm">
                    ⚠️ This certificate has expired
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Quality Metrics</h3>
                {certificate.qualityGrade && (
                  <p><span className="font-medium">Quality Grade:</span> {certificate.qualityGrade}</p>
                )}
                {certificate.coveragePercentage && (
                  <p><span className="font-medium">Coverage:</span> {certificate.coveragePercentage}%</p>
                )}
                {certificate.assuranceLevel && (
                  <p><span className="font-medium">Assurance Level:</span> {certificate.assuranceLevel}</p>
                )}
                {certificate.verificationStandard && (
                  <p><span className="font-medium">Standard:</span> {certificate.verificationStandard}</p>
                )}
              </div>
            </div>
          </section>

          {/* Actions */}
          <section className="text-center space-y-4">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Certificate Actions</h2>
            <div className="flex flex-wrap gap-4 justify-center">
              <CopyToClipboard 
                value={verificationUrl} 
                label="📋 Copy Verification URL"
                className="btn btn-outline"
              />
              
              {/* TODO: Fix DownloadQrButton to generate QR code internally */}
              <button 
                className="btn btn-outline"
                onClick={() => window.open(verificationUrl, '_blank')}
              >
                🔍 View Certificate
              </button>
              
              <button 
                onClick={() => window.print()} 
                className="btn btn-primary"
              >
                🖨️ Print Certificate
              </button>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="bg-gray-50 px-8 py-6 text-center text-sm text-gray-600">
          <p className="mb-2">
            This certificate is digitally signed and can be verified at:{' '}
            <a href={verificationUrl} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
              {domain}/certificate/{certificate.publicId}
            </a>
          </p>
          <p>
            For questions about this certificate, please contact the issuing organization.
          </p>
        </footer>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          @page { 
            size: A4 portrait; 
            margin: 12mm; 
          }
          * { 
            color-adjust: exact; 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
          }
          .certificate-container {
            background: white !important;
            padding: 0 !important;
            min-height: auto !important;
          }
          .shadow-2xl {
            box-shadow: none !important;
          }
          .rounded-lg {
            border-radius: 0 !important;
          }
          button {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
