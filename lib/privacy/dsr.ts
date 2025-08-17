import { prisma } from '@/lib/prisma';

export async function buildUserExport(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      accounts: true,
      sessions: { select: { id: true, expires: true } },
      memberships: {
        include: {
          organization: { select: { id: true, name: true, countryCode: true } }
        }
      }
    }
  });
  if (!user) throw new Error('USER_NOT_FOUND');

  // Do not return secrets/tokens; redact access tokens etc.
  const accounts = user.accounts.map(a => ({
    id: a.id, provider: a.provider, providerAccountId: a.providerAccountId, type: a.type, scope: a.scope
  }));

  return {
    user: {
      id: user.id, email: user.email, name: user.name, image: user.image,
      createdAt: user.createdAt, updatedAt: user.updatedAt
    },
    organizations: user.memberships.map(m => ({
      organizationId: m.organizationId,
      organization: m.organization,
      role: m.role,
      joinedAt: m.createdAt
    })),
    auth: { accounts, sessions: user.sessions },
  };
}

export async function anonymizeUser(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u) throw new Error('USER_NOT_FOUND');
  const anonEmail = `deleted+${u.id}@example.com`;

  // Soft delete: anonymize PII and disable auth (accounts/sessions are cascaded)
  await prisma.$transaction([
    prisma.account.deleteMany({ where: { userId } }),
    prisma.session.deleteMany({ where: { userId } }),
    prisma.user.update({
      where: { id: userId },
      data: { email: anonEmail, name: null, image: null, emailVerified: null }
    }),
  ]);

  return { email: anonEmail };
}
