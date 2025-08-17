import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import SupplierProduction from '@/components/SupplierProduction';

export const metadata: Metadata = {
  title: 'Supplier Production - GreenMetrics',
  description: 'Manage production data and certificates',
};

interface SupplierPageProps {
  params: Promise<{ locale: string; orgId: string }>;
}

export default async function SupplierPage({ params }: SupplierPageProps) {
  const resolvedParams = await params;
  const { orgId } = resolvedParams;
  
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/auth/signin');
  }

  // Check if user has access to this organization
  const userOrg = await prisma.membership.findFirst({
    where: {
      userId: session.user.id,
      organizationId: orgId,
      role: {
        in: ['VIEWER', 'EDITOR', 'ADMIN']
      }
    },
    include: {
      organization: true
    }
  });

  if (!userOrg) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SupplierProduction 
        organizationId={orgId}
        organizationName={userOrg.organization.name}
      />
    </div>
  );
}
