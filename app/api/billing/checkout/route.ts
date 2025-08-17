import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createCheckoutSession } from '@/lib/billing/stripe';
import { getUsageStats, QUOTAS } from '@/lib/billing/entitlements';

// Use Node.js runtime for better Stripe compatibility
export const runtime = 'nodejs';

const CheckoutSchema = z.object({
  orgId: z.string().min(1),
  plan: z.enum(['BASIC', 'PRO']),
  locale: z.enum(['en', 'fr']).default('en'),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = CheckoutSchema.parse(await req.json());
    
    // TODO: Verify user has ADMIN role for the organization
    // await requireOrgRole(body.orgId, 'ADMIN');
    
    // Get current usage to validate upgrade eligibility
    const usage = await getUsageStats(body.orgId);
    const targetQuotas = QUOTAS[body.plan];
    
    // Prevent downgrades when current usage exceeds target plan limits
    const wouldExceedLimits = 
      usage.usage.suppliers.used > targetQuotas.supplierLinks ||
      usage.usage.reports.used > targetQuotas.reportsPerMonth ||
      usage.usage.storage.used > targetQuotas.storageGB;
    
    if (wouldExceedLimits) {
      return NextResponse.json(
        { 
          error: 'Cannot downgrade: current usage exceeds plan limits',
          details: {
            currentSuppliers: usage.usage.suppliers.used,
            planLimit: targetQuotas.supplierLinks,
            currentReports: usage.usage.reports.used,
            reportsLimit: targetQuotas.reportsPerMonth,
            currentStorage: usage.usage.storage.used,
            storageLimit: targetQuotas.storageGB,
          }
        },
        { status: 400 }
      );
    }

    // Create Stripe checkout session with optimal defaults
    const session = await createCheckoutSession({
      orgId: body.orgId,
      plan: body.plan,
      locale: body.locale,
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });

  } catch (error) {
    console.error('Checkout creation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    if (error instanceof Error) {
      // Handle Stripe errors
      if (error.message.includes('No such price')) {
        return NextResponse.json(
          { error: 'Plan not configured. Please contact support.' },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
