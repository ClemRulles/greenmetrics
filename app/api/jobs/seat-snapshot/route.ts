import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { computeDailySeats } from '@/lib/billing/seats';
import { prisma } from '@/lib/prisma';

// Use Node.js runtime for database operations
export const runtime = 'nodejs';

const JobSchema = z.object({
  secret: z.string().min(1),
  force: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const body = JobSchema.parse(await req.json());
    
    // Verify job secret to prevent unauthorized runs
    const expectedSecret = process.env.JOB_SECRET;
    if (!expectedSecret || body.secret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const today = new Date();
    const periodKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    
    console.log(`[SeatSnapshot] Starting seat snapshot job for period: ${periodKey}`);
    
    // Get all organizations with active billing customers
    const organizations = await prisma.organization.findMany({
      include: {
        billingCustomer: {
          include: {
            subscriptions: {
              where: {
                status: {
                  in: ['ACTIVE', 'TRIALING', 'PAST_DUE'],
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
              take: 1,
            },
            usageSnapshots: {
              where: {
                periodKey: periodKey,
              },
              take: 1,
            },
          },
        },
        supplierLinks: {
          where: {
            // Only count accepted supplier links as seats
            // Note: filtering by status will need to be done in JS as this field may not exist
          },
        },
      },
    });
    
    // Filter to only organizations with billing customers
    const billingOrgs = organizations.filter(org => org.billingCustomer);
    
    let processedCount = 0;
    let skippedCount = 0;
    
    for (const org of billingOrgs) {
      const customer = org.billingCustomer!;
      
      // Skip if snapshot already exists for this period (unless forced)
      if (customer.usageSnapshots.length > 0 && !body.force) {
        console.log(`[SeatSnapshot] Skipping ${org.slug} - snapshot exists`);
        skippedCount++;
        continue;
      }
      
      // Skip if no active subscription
      if (customer.subscriptions.length === 0) {
        console.log(`[SeatSnapshot] Skipping ${org.slug} - no active subscription`);
        skippedCount++;
        continue;
      }
      
      try {
        // Compute seat metrics for this organization
        const seatData = await computeDailySeats();
        
        // Count active supplier links as current seats
        // TODO: filter by actual status field when available
        const currentSeats = org.supplierLinks.length;
        
        // For now, use current seats as peak (will be improved with actual tracking)
        const peakSeats = Math.max(currentSeats, customer.usageSnapshots[0]?.peakSeats || 0);
        
        // Create or update usage snapshot
        const existingSnapshot = customer.usageSnapshots[0];
        
        if (existingSnapshot && body.force) {
          // Update existing snapshot
          await prisma.usageSnapshot.update({
            where: { id: existingSnapshot.id },
            data: {
              currentSeats: currentSeats,
              peakSeats: peakSeats,
              snapshotAt: today,
            },
          });
          console.log(`[SeatSnapshot] Updated ${org.slug}: current=${currentSeats}, peak=${peakSeats}`);
        } else {
          // Create new snapshot
          await prisma.usageSnapshot.create({
            data: {
              customerId: customer.id,
              periodKey: periodKey,
              currentSeats: currentSeats,
              peakSeats: peakSeats,
              reportsGenerated: 0, // TODO: compute from actual usage
              exportsRequested: 0, // TODO: compute from actual usage
              apiCalls: 0, // TODO: compute from actual usage
              storageUsedBytes: 0, // TODO: compute from actual usage
              snapshotAt: today,
            },
          });
          console.log(`[SeatSnapshot] Created ${org.slug}: current=${currentSeats}, peak=${peakSeats}`);
        }
        
        processedCount++;
        
      } catch (error) {
        console.error(`[SeatSnapshot] Error processing ${org.slug}:`, error);
        // Continue with other organizations
      }
    }
    
    const result = {
      success: true,
      periodKey,
      processed: processedCount,
      skipped: skippedCount,
      total: billingOrgs.length,
      timestamp: today.toISOString(),
    };
    
    console.log(`[SeatSnapshot] Job completed:`, result);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Seat snapshot job error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Seat snapshot job failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    service: 'seat-snapshot-job',
    status: 'ready',
    timestamp: new Date().toISOString(),
  });
}
