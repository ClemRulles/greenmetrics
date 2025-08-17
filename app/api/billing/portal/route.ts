import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createPortalSession } from '@/lib/billing/stripe';
import { prisma } from '@/lib/prisma';

// Use Node.js runtime for better Stripe compatibility
export const runtime = 'nodejs';

const PortalSchema = z.object({
  orgId: z.string().min(1),
  locale: z.enum(['en', 'fr']).default('en'),
  returnUrl: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = PortalSchema.parse(await req.json());
    
    // TODO: Verify user has ADMIN role for the organization
    // await requireOrgRole(body.orgId, 'ADMIN');
    
    // Get organization with billing customer to find Stripe customer ID
    const org = await prisma.organization.findUnique({
      where: { id: body.orgId },
      include: {
        billingCustomer: {
          select: { stripeCustomerId: true },
        },
      },
    });
    
    if (!org?.billingCustomer?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No billing account found. Please create a subscription first.' },
        { status: 404 }
      );
    }
    
    // Create Stripe customer portal session
    const session = await createPortalSession({
      customerId: org.billingCustomer.stripeCustomerId,
      locale: body.locale,
      returnUrl: body.returnUrl,
    });

    return NextResponse.json({
      url: session.url,
    });

  } catch (error) {
    console.error('Portal creation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    if (error instanceof Error) {
      // Handle common Stripe errors
      if (error.message.includes('No such customer')) {
        return NextResponse.json(
          { error: 'No billing account found. Please create a subscription first.' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
