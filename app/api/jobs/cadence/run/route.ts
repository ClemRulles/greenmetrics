import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runMonthlyClose } from '@/lib/cadence/close';
import { runBackfillProcess } from '@/lib/cadence/backfill';
import { prisma } from '@/lib/prisma';

// Use Node.js runtime for database operations
export const runtime = 'nodejs';

const JobSchema = z.object({
  secret: z.string().min(1),
  jobType: z.enum(['monthly_close', 'backfill', 'regeneration']),
  monthPeriod: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid month period format (YYYY-MM)'),
  organizationId: z.string().optional(), // for targeted operations
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

    console.log(`[CadenceEngine] Starting ${body.jobType} job for period: ${body.monthPeriod}`);

    // Create job record
    const job = await prisma.cadenceJob.create({
      data: {
        jobType: body.jobType,
        monthPeriod: body.monthPeriod,
        organizationId: body.organizationId,
        status: 'PROCESSING',
        startedAt: new Date(),
        metadata: {
          force: body.force,
          triggeredBy: 'api',
          userAgent: req.headers.get('user-agent'),
        },
      },
    });

    let result;
    let affectedCount = 0;
    let errorCount = 0;

    try {
      switch (body.jobType) {
        case 'monthly_close':
          result = await runMonthlyClose(body.monthPeriod, body.organizationId, body.force);
          affectedCount = result.processedOrganizations;
          errorCount = result.errors.length;
          break;
          
        case 'backfill':
          result = await runBackfillProcess(body.monthPeriod, body.organizationId);
          affectedCount = result.backfilledRecords;
          errorCount = result.errors.length;
          break;
          
        case 'regeneration':
          // Future implementation for triggered recomputations
          result = { message: 'Regeneration job type not implemented yet' };
          break;
          
        default:
          throw new Error(`Unknown job type: ${body.jobType}`);
      }

      // Update job as completed
      await prisma.cadenceJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          affectedCount,
          errorCount,
          completedAt: new Date(),
          processingTimeMs: Date.now() - job.startedAt!.getTime(),
          metadata: {
            ...job.metadata as object,
            result,
          },
        },
      });

      console.log(`[CadenceEngine] Completed ${body.jobType} job: ${affectedCount} records, ${errorCount} errors`);

      return NextResponse.json({
        success: true,
        jobId: job.id,
        affectedCount,
        errorCount,
        processingTimeMs: Date.now() - job.startedAt!.getTime(),
        result,
      });

    } catch (processingError) {
      console.error(`[CadenceEngine] Error in ${body.jobType} job:`, processingError);

      // Update job as failed
      await prisma.cadenceJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          processingTimeMs: Date.now() - job.startedAt!.getTime(),
          errorDetails: {
            error: processingError instanceof Error ? processingError.message : String(processingError),
            stack: processingError instanceof Error ? processingError.stack : undefined,
          },
        },
      });

      return NextResponse.json(
        {
          error: 'Job execution failed',
          jobId: job.id,
          details: processingError instanceof Error ? processingError.message : String(processingError),
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[CadenceEngine] Job setup error:', error);
    
    return NextResponse.json(
      {
        error: 'Invalid job request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Health check endpoint
    const url = new URL(req.url);
    const jobId = url.searchParams.get('jobId');
    
    if (jobId) {
      // Get specific job status
      const job = await prisma.cadenceJob.findUnique({
        where: { id: jobId },
        select: {
          id: true,
          jobType: true,
          monthPeriod: true,
          status: true,
          affectedCount: true,
          errorCount: true,
          processingTimeMs: true,
          startedAt: true,
          completedAt: true,
          createdAt: true,
        },
      });

      if (!job) {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(job);
    }

    // Get recent jobs overview
    const recentJobs = await prisma.cadenceJob.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        jobType: true,
        monthPeriod: true,
        status: true,
        affectedCount: true,
        errorCount: true,
        processingTimeMs: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
      },
    });

    const stats = await prisma.cadenceJob.groupBy({
      by: ['status', 'jobType'],
      _count: true,
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
    });

    return NextResponse.json({
      health: 'OK',
      recentJobs,
      stats,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[CadenceEngine] Health check error:', error);
    
    return NextResponse.json(
      {
        health: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
