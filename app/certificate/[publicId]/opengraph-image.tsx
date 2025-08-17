import { ImageResponse } from 'next/og';
import { prisma } from '@/lib/prisma';
import { hmacVerifyEdge } from '@/lib/certificates/signature-edge';

export const runtime = 'edge';
export const alt = 'Certificate Verification';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;

  try {
    // Fetch certificate data
    const cert = await prisma.certificate.findUnique({
      where: { publicId },
      include: {
        supplier: {
          select: { name: true }
        }
      }
    });

    if (!cert) {
      return new ImageResponse(
        (
          <div
            style={{
              fontSize: 64,
              background: 'linear-gradient(135deg, #fee2e2 0%, #fed7d7 100%)',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              color: '#dc2626',
            }}
          >
            Certificate Not Found
          </div>
        ),
        { ...size }
      );
    }

    const valid = !cert.revokedAt && await hmacVerifyEdge(cert);
    const periodEnd = new Date(cert.periodEnd);
    const totalEmissions = Math.round(
      Number(cert.scope1Kg) + Number(cert.scope2LBKg) + Number(cert.scope2MBKg)
    );

    if (!valid) {
      return new ImageResponse(
        (
          <div
            style={{
              fontSize: 48,
              background: 'linear-gradient(135deg, #fee2e2 0%, #fed7d7 100%)',
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              color: '#dc2626',
              padding: '40px',
            }}
          >
            <div style={{ fontSize: 56, marginBottom: '20px' }}>⚠️</div>
            <div style={{ marginBottom: '10px' }}>Certificate Revoked</div>
            <div style={{ fontSize: 32, opacity: 0.8 }}>
              This certificate is no longer valid
            </div>
          </div>
        ),
        { ...size }
      );
    }

    return new ImageResponse(
      (
        <div
          style={{
            fontSize: 32,
            background: 'linear-gradient(135deg, #ecfdf5 0%, #dbeafe 100%)',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 40px',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '30px',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '20px',
                fontSize: '28px',
              }}
            >
              ✓
            </div>
            <div
              style={{
                fontSize: 48,
                fontWeight: 'bold',
                color: '#1f2937',
              }}
            >
              Verified Certificate
            </div>
          </div>

          {/* Organization */}
          <div
            style={{
              fontSize: 40,
              fontWeight: '600',
              color: '#059669',
              marginBottom: '20px',
              textAlign: 'center',
            }}
          >
            {cert.supplier?.name || 'Unknown Organization'}
          </div>

          {/* Period */}
          <div
            style={{
              fontSize: 24,
              color: '#6b7280',
              marginBottom: '30px',
            }}
          >
            Reporting Period: {periodEnd.getUTCFullYear()}
          </div>

          {/* Key metrics */}
          <div
            style={{
              display: 'flex',
              gap: '40px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'white',
                padding: '20px 30px',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            >
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#1f2937' }}>
                {totalEmissions}
              </div>
              <div style={{ fontSize: 18, color: '#6b7280' }}>kg CO₂e Total</div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'white',
                padding: '20px 30px',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            >
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#1f2937' }}>
                {Number(cert.intensityPerUnitKg).toFixed(3)}
              </div>
              <div style={{ fontSize: 18, color: '#6b7280' }}>
                kg/{cert.unitLabel} Intensity
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'white',
                padding: '20px 30px',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            >
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#1f2937' }}>
                {cert.qualityGrade}
              </div>
              <div style={{ fontSize: 18, color: '#6b7280' }}>Quality Grade</div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              fontSize: 18,
              color: '#9ca3af',
              textAlign: 'center',
            }}
          >
            Cryptographically verified • Scopes 1–2 • GreenMetrics
          </div>
        </div>
      ),
      {
        ...size,
        // Use system fonts for better compatibility
      }
    );
  } catch (error) {
    console.error('Error generating OpenGraph image:', error);
    
    // Fallback error image
    return new ImageResponse(
      (
        <div
          style={{
            fontSize: 48,
            background: 'linear-gradient(135deg, #fee2e2 0%, #fed7d7 100%)',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            color: '#dc2626',
          }}
        >
          Certificate Unavailable
        </div>
      ),
      { ...size }
    );
  }
}
