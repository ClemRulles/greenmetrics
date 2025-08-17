import { prisma } from '../lib/prisma';

async function main() {
  // Check if we have a working database connection
  try {
    await prisma.$connect();
    console.log('Database connection successful');
  } catch (error) {
    console.log('Database not available, skipping seed:', error instanceof Error ? error.message : String(error));
    return;
  }

  const org = await prisma.organization.upsert({
    where: { slug: 'demo-org' },
    update: {},
    create: { name: 'Demo Org', slug: 'demo-org', description: 'Seed organization for demo' },
  });

  const user = await prisma.user.upsert({
    where: { email: 'demo@greenmetrics.dev' },
    update: {},
    create: { email: 'demo@greenmetrics.dev', name: 'Demo User' },
  });

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
    update: {},
    create: { userId: user.id, organizationId: org.id, role: 'OWNER' },
  });

  // Note: emission factors & traces will be added in later migrations per docs.
  console.log('Seed complete:', { org: org.slug, user: user.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
