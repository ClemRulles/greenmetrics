import { NextResponse } from 'next/server';
import type { UiEntitlements, UiUsage } from '../../../../types/billing';

export async function GET() {
  try {
    // Mock billing data for testing
    const entitlements: UiEntitlements = {
      reports: 100,
      teamSeats: 5,
      features: ['advanced-analytics', 'custom-reports', 'api-access'],
    };

    const usage: UiUsage = {
      reportsUsed: 25,
      seatsUsed: 3,
      period: 'current',
    };

    return NextResponse.json({
      entitlements,
      usage,
      status: 'active',
    });
  } catch (error) {
    console.error('Billing entitlements error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billing entitlements' },
      { status: 500 }
    );
  }
}
