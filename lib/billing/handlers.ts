import { prisma } from '@/lib/prisma';
import { applyPlanEntitlements, applyGraceEntitlements, freezeEntitlements } from './entitlements';

type StripeObject = Record<string, any>;
type Plan = 'FREE'|'BASIC'|'PRO';

function mapPriceToPlan(priceId: string): Plan {
  if (priceId === process.env.STRIPE_PRICE_PRO || priceId === 'price_pro_placeholder_eur') return 'PRO';
  if (priceId === process.env.STRIPE_PRICE_BASIC || priceId === 'price_basic_placeholder_eur') return 'BASIC';
  return 'FREE';
}

function graceUntil(days = 7) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export async function onCheckoutSessionCompleted(obj: StripeObject) {
  // Expect obj.customer, obj.customer_details, obj.metadata.orgId
  const orgId: string | undefined = obj?.metadata?.orgId;
  if (!orgId) return;

  const customerId = String(obj.customer);
  await prisma.billingCustomer.upsert({
    where: { organizationId: orgId },
    create: {
      organizationId: orgId,
      stripeCustomerId: customerId,
      countryCode: obj.customer_details?.address?.country ?? null,
      vatId: obj.customer_details?.tax_ids?.[0]?.value ?? null,
      address: obj.customer_details?.address ?? null,
    },
    update: { 
      stripeCustomerId: customerId,
      countryCode: obj.customer_details?.address?.country ?? null,
      vatId: obj.customer_details?.tax_ids?.[0]?.value ?? null,
    },
  });
}

export async function onSubscriptionUpdated(obj: StripeObject) {
  // obj.id, obj.status, obj.items.data[0].price.id, obj.current_period_end, obj.cancel_at_period_end
  const customerId = String(obj.customer);
  const priceId = obj?.items?.data?.[0]?.price?.id as string | undefined;
  const plan = priceId ? mapPriceToPlan(priceId) : 'FREE';

  // find billing customer
  const bc = await prisma.billingCustomer.findFirst({ where: { stripeCustomerId: customerId } });
  if (!bc) return;

  const status = String(obj.status || 'incomplete').toUpperCase();
  const currentPeriodEnd = new Date((obj.current_period_end ?? 0) * 1000);
  const cancelAtPeriodEnd = Boolean(obj.cancel_at_period_end);

  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: obj.id },
    create: {
      customerId: bc.id,
      stripeSubscriptionId: obj.id,
      stripePriceId: priceId || '',
      planType: plan,
      status: status as any,
      currentPeriodStart: new Date((obj.current_period_start ?? 0) * 1000),
      currentPeriodEnd,
      cancelAtPeriodEnd,
      gracePeriodEnd: null,
    },
    update: {
      stripePriceId: priceId || '',
      planType: plan,
      status: status as any,
      currentPeriodEnd,
      cancelAtPeriodEnd,
    },
  });

  // entitlement policy
  if (status === 'ACTIVE' || status === 'TRIALING') {
    await applyPlanEntitlements(bc.organizationId, plan);
  } else if (status === 'PAST_DUE' || status === 'UNPAID' || status === 'INCOMPLETE') {
    const until = graceUntil();
    await applyGraceEntitlements(bc.organizationId, plan, until);
  } else if (status === 'CANCELED' || status === 'PAUSED') {
    await freezeEntitlements(bc.organizationId);
  }
}

export async function onSubscriptionDeleted(obj: StripeObject) {
  const customerId = String(obj.customer);
  const bc = await prisma.billingCustomer.findFirst({ where: { stripeCustomerId: customerId } });
  if (!bc) return;
  await prisma.subscription.updateMany({
    where: { customerId: bc.id },
    data: { status: 'CANCELED', gracePeriodEnd: null },
  });
  await freezeEntitlements(bc.organizationId);
}

export async function onInvoicePaid(obj: StripeObject) {
  const customerId = String(obj.customer);
  const bc = await prisma.billingCustomer.findFirst({ where: { stripeCustomerId: customerId } });
  if (!bc) return;

  // Reactivate current plan after payment
  const sub = await prisma.subscription.findFirst({ where: { customerId: bc.id } });
  const plan: Plan = (sub?.planType ?? 'FREE') as Plan;
  await prisma.subscription.updateMany({
    where: { customerId: bc.id },
    data: { status: 'ACTIVE', gracePeriodEnd: null, inGracePeriod: false },
  });
  await applyPlanEntitlements(bc.organizationId, plan);
}

export async function onInvoicePaymentFailed(obj: StripeObject) {
  const customerId = String(obj.customer);
  const bc = await prisma.billingCustomer.findFirst({ where: { stripeCustomerId: customerId } });
  if (!bc) return;

  const sub = await prisma.subscription.findFirst({ where: { customerId: bc.id } });
  const plan: Plan = (sub?.planType ?? 'FREE') as Plan;
  const until = graceUntil(); // 7 days
  await prisma.subscription.updateMany({
    where: { customerId: bc.id },
    data: { status: 'PAST_DUE', gracePeriodEnd: until, inGracePeriod: true },
  });
  await applyGraceEntitlements(bc.organizationId, plan, until);
}
