export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { constructEvent, WEBHOOK_SECRET } from '@/lib/billing/stripe';
import { onCheckoutSessionCompleted, onSubscriptionUpdated, onSubscriptionDeleted, onInvoicePaid, onInvoicePaymentFailed } from '@/lib/billing/handlers';
import { prisma } from '@/lib/prisma';

async function upsertEventLog(id: string, type: string, raw: string) {
  // idempotency guard
  await prisma.stripeEventLog.upsert({
    where: { eventId: id },
    create: { eventId: id, type, raw },
    update: {},
  });
}

export async function POST(req: Request) {
  const whSecret = WEBHOOK_SECRET;
  if (!whSecret) return NextResponse.json({ ok: true, reason: 'webhook disabled' }, { status: 200 });

  // Get signature from request headers directly
  const sig = req.headers.get('stripe-signature') || '';
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
    switch (event.type) {
      case 'checkout.session.completed':
        await onCheckoutSessionCompleted(event.data.object);
        break;
      case 'customer.subscription.updated':
        await onSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await onSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.paid':
        await onInvoicePaid(event.data.object);
        break;
      case 'invoice.payment_failed':
        await onInvoicePaymentFailed(event.data.object);
        break;
      default:
        // ignore unknown events
        break;
    }
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: 'handler_failed', detail: e?.message }, { status: 500 });
  }
}
