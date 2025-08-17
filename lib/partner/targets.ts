import { prisma } from '@/lib/prisma';

export type Targets = { 
  coveragePct: number; 
  dqsMin: 'A' | 'B' | 'C'; 
  targetTons: number; 
  baselineYear: number; 
};

export type Progress = { 
  coveragePct: number; 
  dqsAvg: number; 
  attributedTons: number; 
  deltaTons: number; 
  onTrack: boolean; 
};

/**
 * Compute current progress against partner targets
 */
export async function computeProgress(orgId: string, year: number, targets: Targets): Promise<Progress> {
  try {
    // Get coverage metrics (mock implementation - would integrate with existing coverage pipeline)
    const coverage = await getCoverageMetrics(orgId, year);
    
    // Get attributed tons (mock implementation - would integrate with existing attribution pipeline)
    const attributedTons = await getPartnerAttributedTons(orgId, year);
    
    // Calculate deltas and tracking status
    const deltaTons = attributedTons - targets.targetTons;
    const dqsScore = letterToScore(targets.dqsMin);
    const onTrack = coverage.coveragePct >= targets.coveragePct && 
                   coverage.dqsAvg >= dqsScore && 
                   attributedTons <= targets.targetTons;

    return {
      coveragePct: coverage.coveragePct,
      dqsAvg: coverage.dqsAvg,
      attributedTons,
      deltaTons,
      onTrack
    };
  } catch (error) {
    console.error('Error computing progress:', error);
    throw new Error('Failed to compute progress metrics');
  }
}

/**
 * Get or create partner targets with defaults
 */
export async function getPartnerTargets(orgId: string): Promise<Targets> {
  try {
    const existing = await (prisma as any).partnerTargets?.findUnique({
      where: { organizationId: orgId }
    });

    if (existing) {
      return {
        coveragePct: existing.coveragePct,
        dqsMin: existing.dqsMin as 'A' | 'B' | 'C',
        targetTons: existing.targetTons,
        baselineYear: existing.baselineYear
      };
    }

    // Return defaults if no targets set
    const currentYear = new Date().getFullYear();
    return {
      coveragePct: 80, // Default 80% coverage target
      dqsMin: 'B' as const, // Default minimum B grade
      targetTons: 1000, // Default 1000 tCO2e target
      baselineYear: currentYear - 1 // Previous year as baseline
    };
  } catch (error) {
    console.error('Error getting partner targets:', error);
    // Return defaults on any error
    const currentYear = new Date().getFullYear();
    return {
      coveragePct: 80,
      dqsMin: 'B' as const,
      targetTons: 1000,
      baselineYear: currentYear - 1
    };
  }
}

/**
 * Update partner targets
 */
export async function updatePartnerTargets(orgId: string, targets: Targets): Promise<void> {
  try {
    await (prisma as any).partnerTargets?.upsert({
      where: { organizationId: orgId },
      update: {
        coveragePct: targets.coveragePct,
        dqsMin: targets.dqsMin,
        targetTons: targets.targetTons,
        baselineYear: targets.baselineYear,
        updatedAt: new Date()
      },
      create: {
        organizationId: orgId,
        coveragePct: targets.coveragePct,
        dqsMin: targets.dqsMin,
        targetTons: targets.targetTons,
        baselineYear: targets.baselineYear
      }
    });
  } catch (error) {
    console.error('Error updating partner targets:', error);
    throw new Error('Failed to update partner targets');
  }
}

/**
 * Create a progress snapshot
 */
export async function createTargetSnapshot(orgId: string, progress: Progress): Promise<void> {
  try {
    await (prisma as any).partnerTargetSnapshot?.create({
      data: {
        organizationId: orgId,
        coveragePct: progress.coveragePct,
        dqsAvg: progress.dqsAvg,
        attributedTons: progress.attributedTons,
        deltaTons: progress.deltaTons,
        onTrack: progress.onTrack,
        atUtc: new Date()
      }
    });
  } catch (error) {
    console.error('Error creating target snapshot:', error);
    throw new Error('Failed to create target snapshot');
  }
}

/**
 * Get recent snapshots for trend analysis
 */
export async function getRecentSnapshots(orgId: string, limit = 30): Promise<any[]> {
  try {
    return await (prisma as any).partnerTargetSnapshot?.findMany({
      where: { organizationId: orgId },
      orderBy: { atUtc: 'desc' },
      take: limit
    }) || [];
  } catch (error) {
    console.error('Error getting recent snapshots:', error);
    return [];
  }
}

/**
 * Convert DQS letter grade to numeric score for comparison
 */
function letterToScore(letter: 'A' | 'B' | 'C'): number {
  switch (letter) {
    case 'A': return 0.9;
    case 'B': return 0.7;
    case 'C': return 0.5;
    default: return 0.5;
  }
}

/**
 * Mock implementation - would integrate with existing coverage pipeline
 */
async function getCoverageMetrics(orgId: string, year: number): Promise<{ coveragePct: number; dqsAvg: number }> {
  // This would normally call existing coverage calculation functions
  // For now, return mock data
  return {
    coveragePct: 75.5, // Example: 75.5% coverage
    dqsAvg: 0.8 // Example: B+ average quality (0.8)
  };
}

/**
 * Mock implementation - would integrate with existing attribution pipeline  
 */
async function getPartnerAttributedTons(orgId: string, year: number): Promise<number> {
  // This would normally call existing attribution calculation functions
  // For now, return mock data
  return 850.5; // Example: 850.5 tCO2e attributed
}

/**
 * Validate targets input
 */
export function validateTargets(targets: Partial<Targets>): string[] {
  const errors: string[] = [];

  if (typeof targets.coveragePct !== 'number' || targets.coveragePct < 0 || targets.coveragePct > 100) {
    errors.push('Coverage percentage must be between 0 and 100');
  }

  if (!targets.dqsMin || !['A', 'B', 'C'].includes(targets.dqsMin)) {
    errors.push('DQS minimum must be A, B, or C');
  }

  if (typeof targets.targetTons !== 'number' || targets.targetTons < 0) {
    errors.push('Target tons must be a positive number');
  }

  const currentYear = new Date().getFullYear();
  if (typeof targets.baselineYear !== 'number' || 
      targets.baselineYear < 2000 || 
      targets.baselineYear > currentYear) {
    errors.push(`Baseline year must be between 2000 and ${currentYear}`);
  }

  return errors;
}
