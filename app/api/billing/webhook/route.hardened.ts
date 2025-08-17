export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { constructEvent, WEBHOOK_SECRET } from '@/lib/billing/stripe';
import { prisma } from '@/lib/prisma';

async function upsertEventLog(id: string, type: string, raw: string) {
  // idempotency guard
  await prisma.stripeEventLog.upsert({
    where: { eventId: id },
    create: { eventId: id, type, raw },
    update: {},
  });
}

async function handleEvent(evt: any) {
  switch (evt.type) {
    case 'checkout.session.completed':
      // TODO: link session to BillingCustomer + Subscription
      return;
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
    case 'invoice.paid':
    case 'invoice.payment_failed':
      // TODO: update subscription/grace/entitlements accordingly
      return;
    default:
      return; // ignore unknowns
  }
}

export async function POST(req: Request) {
  const whSecret = WEBHOOK_SECRET;
  if (!whSecret) return NextResponse.json({ ok: true, reason: 'webhook disabled' }, { status: 200 });

  // raw body
  const headersList = await headers();
  const sig = headersList.get('stripe-signature') || '';
  const raw = await req.text();

  let event: any;
  try {
    event = constructEvent(raw, sig, whSecret);
  } catch {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  try {
    await upsertEventLog(event.id ?? 'evt_local_' + Date.now(), event.type, raw);
  } catch {
    // duplicate event → already processed
    return NextResponse.json({ received: true, deduped: true }, { status: 200 });
  }

  try {
    await handleEvent(event);
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: 'handler_failed', detail: e?.message }, { status: 500 });
  }
}
