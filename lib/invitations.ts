import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { writeAuditLog } from '@/lib/privacy/audit';
import { getTransport } from '@/lib/mail/transport';
import { inviteEmailEN } from '@/emails/invite.en';
import { inviteEmailFR } from '@/emails/invite.fr';

const days = (n: number) => n * 24 * 60 * 60 * 1000;

export async function createInvitation(params: {
  orgId: string; 
  creatorUserId: string; 
  email: string; 
  role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER'; 
  locale?: 'en' | 'fr';
}) {
  const token = randomBytes(24).toString('base64url');
  const ttlDays = Number(process.env.INVITE_TTL_DAYS || 14);
  const expiresAt = new Date(Date.now() + days(ttlDays));

  const org = await prisma.organization.findUnique({ 
    where: { id: params.orgId }, 
    select: { name: true } 
  });
  if (!org) throw new Error('ORG_NOT_FOUND');

  // For now, create with basic fields and extend later
  const inv = await prisma.invitation.create({
    data: {
      orgId: params.orgId,
      email: params.email.toLowerCase(),
      role: params.role,
      token,
      expiresAt,
      createdBy: params.creatorUserId,
      locale: params.locale
    }
  });

  const acceptUrl = `${process.env.APP_BASE_URL}/api/invitations/${token}/accept`;
  const emailTemplate = params.locale === 'fr' 
    ? inviteEmailFR({ orgName: org.name, acceptUrl, role: params.role })
    : inviteEmailEN({ orgName: org.name, acceptUrl, role: params.role });

  const transport = getTransport();
  await transport.sendMail({ 
    to: params.email, 
    from: process.env.EMAIL_FROM || 'noreply@greenmetrics.dev', 
    subject: emailTemplate.subject, 
    text: emailTemplate.text 
  });

  await writeAuditLog({ 
    userId: params.creatorUserId, 
    orgId: params.orgId, 
    action: 'INVITE_CREATE', 
    targetId: inv.id, 
    metadata: { email: 'redacted', role: params.role } 
  });
  
  return { id: inv.id, token, expiresAt };
}

export async function listInvitations(orgId: string) {
  return prisma.invitation.findMany({ 
    where: { orgId }, 
    orderBy: { expiresAt: 'desc' } 
  });
}

export async function revokeInvitation(params: { token: string; byUserId: string }) {
  const inv = await prisma.invitation.findUnique({ where: { token: params.token } });
  if (!inv) throw new Error('INVITE_NOT_FOUND');
  
  // Delete the invitation for now (we'll add status field in migration)
  await prisma.invitation.delete({ where: { token: params.token } });
  
  await writeAuditLog({ 
    userId: params.byUserId, 
    orgId: inv.orgId, 
    action: 'INVITE_REVOKE', 
    targetId: inv.id 
  });
  
  return inv;
}

export async function acceptInvitation(params: { token: string; userId: string; userEmail: string }) {
  const inv = await prisma.invitation.findUnique({ where: { token: params.token } });
  if (!inv) throw new Error('INVITE_NOT_FOUND');

  const now = new Date();
  if (inv.expiresAt < now) {
    throw new Error('INVITE_EXPIRED');
  }

  if (inv.email.toLowerCase() !== params.userEmail.toLowerCase()) {
    throw new Error('EMAIL_MISMATCH');
  }

  // Create membership if not exists
  await prisma.membership.upsert({
    where: { 
      userId_organizationId: { 
        userId: params.userId, 
        organizationId: inv.orgId 
      } 
    },
    update: { role: inv.role },
    create: { 
      userId: params.userId, 
      organizationId: inv.orgId, 
      role: inv.role 
    }
  });

  // Delete the invitation after acceptance
  await prisma.invitation.delete({ where: { token: params.token } });
  
  await writeAuditLog({ 
    userId: params.userId, 
    orgId: inv.orgId, 
    action: 'INVITE_ACCEPT', 
    targetId: inv.id, 
    metadata: { role: inv.role } 
  });
  
  return inv;
}
