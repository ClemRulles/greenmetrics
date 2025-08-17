import { NextRequest, NextResponse } from 'next/server';
import { withRequestId } from '@/lib/sec/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  try {
    const { publicId } = await params;

    // Mock certificate data for now - will be replaced with actual Prisma query
    // const certificate = await prisma.certificate.findUnique({
    //   where: { publicId },
    //   include: { supplier: { select: { name: true } } }
    // });
    const mockCertificate = {
      publicId,
      supplierOrgId: 'supplier-1',
      supplierName: 'GreenTech Manufacturing Ltd',
      periodStart: new Date('2024-01-01'),
      periodEnd: new Date('2024-12-31'),
      scope1Kg: 1500,
      scope2LBKg: 800,
      scope2MBKg: 600,
      intensityPerUnitKg: 2.1,
      units: 1000,
      unitLabel: 'units produced',
      factorsVersion: 'v2.1',
      frameworkVersion: 'v2.0',
      qualityGrade: 'A',
      issuedAt: '2024-12-01T10:00:00Z',
      signature: 'valid-signature-placeholder',
      revokedAt: null
    };

    // Verify certificate exists and is not revoked
    if (!mockCertificate) {
      return withRequestId(
        NextResponse.json(
          { error: 'Certificate not found' },
          { status: 404 }
        ),
        request
      );
    }

    if (mockCertificate.revokedAt) {
      return withRequestId(
        NextResponse.json(
          { 
            error: 'Certificate revoked',
            revokedAt: mockCertificate.revokedAt
          },
          { status: 410 }
        ),
        request
      );
    }

    // For mock data, skip HMAC verification (would be real in production)
    // const isValid = hmacVerify(mockCertificate);
    const isValid = true; // Mock verification success
    
    if (!isValid) {
      return withRequestId(
        NextResponse.json(
          { error: 'Certificate signature invalid' },
          { status: 403 }
        ),
        request
      );
    }

    // Return public certificate data (no sensitive information)
    return withRequestId(
      NextResponse.json({
        certificate: {
          publicId: mockCertificate.publicId,
          supplierName: mockCertificate.supplierName,
          period: {
            start: mockCertificate.periodStart.toISOString(),
            end: mockCertificate.periodEnd.toISOString()
          },
          emissions: {
            scope1Kg: mockCertificate.scope1Kg,
            scope2LBKg: mockCertificate.scope2LBKg,
            scope2MBKg: mockCertificate.scope2MBKg,
            totalKg: mockCertificate.scope1Kg + mockCertificate.scope2LBKg + mockCertificate.scope2MBKg
          },
          intensity: {
            perUnitKg: mockCertificate.intensityPerUnitKg,
            units: mockCertificate.units,
            unitLabel: mockCertificate.unitLabel
          },
          qualityGrade: mockCertificate.qualityGrade,
          versions: {
            factors: mockCertificate.factorsVersion,
            framework: mockCertificate.frameworkVersion
          },
          issuedAt: mockCertificate.issuedAt,
          verified: true
        }
      }),
      request
    );

  } catch (error) {
    console.error('[Certificate Verification] Error:', error);
    
    return withRequestId(
      NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      ),
      request
    );
  }
}

// Future implementation once database is set up:
/*
export async function GET(request: NextRequest, { params }: { params: Promise<{ publicId: string }> }) {
  try {
    const { publicId } = await params;

    const certificate = await prisma.certificate.findUnique({
      where: { publicId },
      include: {
        supplier: {
          select: { name: true }
        }
      }
    });

    if (!certificate) {
      return withRequestId(
        NextResponse.json({ error: 'Certificate not found' }, { status: 404 }),
        request
      );
    }

    if (certificate.revokedAt) {
      return withRequestId(
        NextResponse.json({ 
          error: 'Certificate revoked',
          revokedAt: certificate.revokedAt
        }, { status: 410 }),
        request
      );
    }

    // Verify HMAC signature
    const payload = {
      publicId: certificate.publicId,
      supplierName: certificate.supplier.name,
      periodStart: certificate.periodStart.toISOString(),
      periodEnd: certificate.periodEnd.toISOString(),
      scope1Kg: Number(certificate.scope1Kg),
      scope2LBKg: Number(certificate.scope2LBKg),
      scope2MBKg: Number(certificate.scope2MBKg),
      intensityPerUnitKg: Number(certificate.intensityPerUnitKg),
      units: Number(certificate.units),
      unitLabel: certificate.unitLabel,
      qualityGrade: certificate.qualityGrade
    };

    const isValid = hmacVerify(payload, certificate.signature);
    if (!isValid) {
      return withRequestId(
        NextResponse.json({ error: 'Certificate signature invalid' }, { status: 403 }),
        request
      );
    }

    const totalKg = Number(certificate.scope1Kg) + Number(certificate.scope2LBKg) + Number(certificate.scope2MBKg);

    return withRequestId(
      NextResponse.json({
        certificate: {
          publicId: certificate.publicId,
          supplierName: certificate.supplier.name,
          period: {
            start: certificate.periodStart.toISOString(),
            end: certificate.periodEnd.toISOString()
          },
          emissions: {
            scope1Kg: Number(certificate.scope1Kg),
            scope2LBKg: Number(certificate.scope2LBKg),
            scope2MBKg: Number(certificate.scope2MBKg),
            totalKg
          },
          intensity: {
            perUnitKg: Number(certificate.intensityPerUnitKg),
            units: Number(certificate.units),
            unitLabel: certificate.unitLabel
          },
          qualityGrade: certificate.qualityGrade,
          issuedAt: certificate.issuedAt.toISOString(),
          verified: true
        }
      }),
      request
    );

  } catch (error) {
    console.error('[Certificate Verification] Error:', error);
    
    return withRequestId(
      NextResponse.json({ error: 'Internal server error' }, { status: 500 }),
      request
    );
  }
}
*/
