import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { type Locale } from '@/i18n';

export default async function ReportsIndex({ params }: { params: Promise<{ locale: Locale }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const { locale } = await params;

  const reports = await prisma.report.findMany({
    where: { organization: { memberships: { some: { userId: session.user.id } } } },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true, language: true },
  });

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <Link className="rounded bg-blue-600 px-3 py-2 text-white" href={`/${locale}/app/reports/new`}>New</Link>
      </div>
      <ul className="space-y-2">
        {reports.map((r) => (
          <li key={r.id} className="rounded border p-3 flex items-center justify-between">
            <span>{r.name} — {r.language.toUpperCase()}</span>
            <Link 
              href={`/${locale}/app/reports/${r.id}`}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              View report
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
