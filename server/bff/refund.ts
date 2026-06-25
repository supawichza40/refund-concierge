/**
 * server/bff/refund.ts — refund execution (Agent B owns)
 * ------------------------------------------------------------------
 * BimpeAI has NO Stripe action wired, so the refund is executed HERE, in our
 * app, when the conversation reaches the refund decision (detected by a marker
 * in the agent reply, OR triggered explicitly via POST /api/refund).
 *
 *   - mode 'simulated' (default): generate a re_sim_* id, no external call.
 *   - mode 'stripe' (iff STRIPE_SECRET_KEY present): a REAL Stripe TEST-mode
 *     refund against a pre-seeded charge, via the Stripe REST API over fetch
 *     (no SDK dependency, so the app always boots).
 *
 * On success this:
 *   1. emits a `refund` `status` (pending -> sent -> delivered) for the card,
 *   2. publishes `refund.issued` then `refund.confirmed` on the bus,
 *   3. invokes the Confirmation Orchestrator's onRefundIssued(ctx) — Agent C's
 *      interface; we CALL it, we never edit it.
 *
 * SERVER-ONLY. Reads the Stripe key from config; the key never reaches the
 * browser and is never logged.
 */

import { config } from '@server/config';
import { bus } from '@server/bff/bus';
import {
  ensureSession,
  setRefund,
  type DemoSession,
  type RefundRecord,
} from '@server/bff/state';
import { onRefundIssued } from '@server/orchestrator';
import { EVENT, makeEvent, type StatusEvent } from '@shared/events';
import type { RefundContext, RefundMode } from '@shared/types';

/**
 * Deterministic marker the demo can rely on to auto-trigger a refund from an
 * agent reply, independent of the agent's exact phrasing. The agent KB can be
 * tuned to emit `[[ISSUE_REFUND]]` (or the looser phrase test below) once it
 * decides; until then the demo uses the explicit POST /api/refund path.
 */
const REFUND_MARKER = /\[\[ISSUE_REFUND\]\]/i;

/**
 * True iff the agent emitted the explicit [[ISSUE_REFUND]] token.
 * Token-only by design: the old phrase fallback was unsafe — it false-fired on
 * anti-abuse refusals ("I can't issue a refund like that") and missed "issued".
 * Agent system prompt v2 emits the token reliably (verified 3/3).
 */
export function replyTriggersRefund(reply: string): boolean {
  if (!reply) return false;
  return REFUND_MARKER.test(reply);
}

/** Strip the internal marker so it never shows in the UI transcript. */
export function stripRefundMarker(reply: string): string {
  return reply.replace(REFUND_MARKER, '').trim();
}

function emitRefundStatus(
  demoId: string,
  refundId: string,
  state: StatusEvent['state'],
  mode: RefundMode,
  detail: string,
): void {
  const evt: StatusEvent = { refundId, channel: 'refund', state, mode, detail, ts: Date.now() };
  bus.publish(makeEvent(EVENT.STATUS, evt, demoId));
}

/** Minor units for Stripe (e.g. £42.99 -> 4299). */
function toMinorUnits(amountMajor: number): number {
  return Math.round(amountMajor * 100);
}

/**
 * Execute a REAL Stripe TEST refund against a pre-seeded charge/payment_intent.
 * Uses the REST API directly (no SDK). Returns the Stripe refund id (re_...).
 * Throws on any failure so the caller can fall back to simulated.
 */
async function executeStripeRefund(amountMajor: number, currency: string): Promise<string> {
  const key = config.stripeSecretKey;
  if (!key) throw new Error('No STRIPE_SECRET_KEY');

  const charge = process.env.STRIPE_CHARGE_ID?.trim();
  const paymentIntent = process.env.STRIPE_PAYMENT_INTENT_ID?.trim();
  if (!charge && !paymentIntent) {
    throw new Error('No STRIPE_CHARGE_ID / STRIPE_PAYMENT_INTENT_ID seeded');
  }

  const form = new URLSearchParams();
  if (charge) form.set('charge', charge);
  else if (paymentIntent) form.set('payment_intent', paymentIntent);
  form.set('amount', String(toMinorUnits(amountMajor)));
  form.set('reason', 'duplicate');
  // Idempotency: one refund per (order) demo run.

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch('https://api.stripe.com/v1/refunds', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': `refund-demo-${charge ?? paymentIntent}`,
      },
      body: form.toString(),
      signal: ctrl.signal,
    });
    const json = (await res.json()) as { id?: string; error?: { message?: string } };
    if (!res.ok || !json.id) {
      throw new Error(`Stripe refund failed: ${res.status} ${json.error?.message ?? ''}`.trim());
    }
    return json.id;
  } finally {
    clearTimeout(timer);
  }
}

export interface IssueRefundResult {
  alreadyIssued: boolean;
  refund: RefundRecord;
  demoId: string;
}

/**
 * Issue the refund for the current session's order and drive the full
 * confirmation flow. Idempotent: a second call returns the existing refund
 * without re-emitting or double-paying.
 */
export async function issueRefund(): Promise<IssueRefundResult> {
  const session: DemoSession = ensureSession();
  const { order, customer } = session.seed;
  const demoId = session.demoId;

  // Idempotency guard — never double-issue within a session.
  if (session.refund) {
    return { alreadyIssued: true, refund: session.refund, demoId };
  }

  // Resolve mode from config (stripe iff key present/forced, else simulated).
  let mode: RefundMode = config.stripeMode;
  let refundId: string;

  emitRefundStatus(demoId, 'pending', 'pending', mode, `Issuing refund for order #${order.id}`);

  if (mode === 'stripe') {
    try {
      refundId = await executeStripeRefund(order.amount, order.currency);
    } catch (err) {
      // Real refund failed → degrade to simulated so the demo never dies.
      bus.publish(
        makeEvent(
          EVENT.ERROR,
          { channel: 'refund', message: `Stripe refund failed, simulating: ${String(err)}` },
          demoId,
        ),
      );
      mode = 'simulated';
      refundId = `re_sim_${Date.now()}`;
    }
  } else {
    refundId = `re_sim_${Date.now()}`;
  }

  const record: RefundRecord = {
    refundId,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    mode,
    issuedAt: Date.now(),
  };
  setRefund(record);

  // 1) refund.issued (the orchestrator-trigger event)
  bus.publish(
    makeEvent(
      EVENT.REFUND_ISSUED,
      { refundId, orderId: order.id, amount: order.amount, currency: order.currency, mode },
      demoId,
    ),
  );
  emitRefundStatus(demoId, refundId, 'sent', mode, `Refund ${refundId} issued (${mode})`);

  // 2) refund.confirmed (dashboard turns the Refund card green)
  bus.publish(
    makeEvent(
      EVENT.REFUND_CONFIRMED,
      { refundId, orderId: order.id, amount: order.amount, currency: order.currency, mode },
      demoId,
    ),
  );
  emitRefundStatus(
    demoId,
    refundId,
    'delivered',
    mode,
    `${order.currency} ${order.amount.toFixed(2)} refunded to ${customer.name}`,
  );

  // 3) Fan out the confirmations via Agent C's orchestrator (fire-and-forget).
  const ctx: RefundContext = {
    refundId,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    mode,
    customer,
    etaDays: order.etaDays,
    item: order.item,
  };
  onRefundIssued(ctx);

  return { alreadyIssued: false, refund: record, demoId };
}
