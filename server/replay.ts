/**
 * server/replay.ts — DETERMINISTIC GOLDEN-PATH REPLAY (demo-engineer owns)
 * ------------------------------------------------------------------------
 * The on-stage SOFTWARE FALLBACK. When the live BimpeAI / Stripe / Gmail /
 * WhatsApp path is unavailable or risky (venue wifi dies, API rate-limits, a
 * key is missing), this module re-plays the EXACT golden-path event sequence
 * onto the same in-process bus the SSE hub reads — so the dashboard lights up
 * identically, with NO external call and NO network dependency.
 *
 * It is GATED: it only runs when config.demoMode === 'replay' (set via the
 * env var DEMO_MODE=replay). The trigger route refuses otherwise, so this can
 * never fire by accident during a real run. Default is OFF.
 *
 * Faithfulness: the front half (agent.reasoning + tool.called + refund.confirmed)
 * is canned from seed.json. The back half (email + WhatsApp confirmations) is
 * delegated to the REAL orchestrator (onRefundIssued) running in its own
 * deterministic stub mode, so the events are byte-identical to a live run —
 * we replay the cause, the same code produces the effect.
 *
 * SERVER-ONLY. Imports the frozen contract (shared/events, shared/types,
 * server/bff/bus, server/config) and seed.json. Touches nothing A/B/C own.
 */

import { bus } from '@server/bff/bus';
import { config } from '@server/config';
import { onRefundIssued } from '@server/orchestrator';
import { EVENT, makeEvent } from '@shared/events';
import type { RefundContext } from '@shared/types';
import seed from '@/seed.json';

// ---------------------------------------------------------------------------
// Re-entrancy guard — one replay at a time per process.
// ---------------------------------------------------------------------------

const GLOBAL_KEY = '__refundConciergeReplayRunning__';

function isRunning(): boolean {
  return (globalThis as Record<string, unknown>)[GLOBAL_KEY] === true;
}
function setRunning(v: boolean): void {
  (globalThis as Record<string, unknown>)[GLOBAL_KEY] = v;
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// The canned golden-path beats. Timings are tuned to the PITCH-SCRIPT demo
// section (≈0:45→1:40): reasoning streams, the Stripe call fires, the refund
// confirms, then the orchestrator fans out email + WhatsApp ~3-4s apart so the
// judges can FOLLOW each card flip. Total ≈ 18-20s of dashboard action.
// ---------------------------------------------------------------------------

interface Beat {
  /** ms to wait BEFORE emitting this beat (relative to the previous beat). */
  after: number;
  emit: (demoId: string, refund: RefundContext) => void;
}

function reasoning(demoId: string, text: string): void {
  bus.publish(makeEvent(EVENT.AGENT_REASONING, { text }, demoId));
}
function tool(demoId: string, t: string, args?: Record<string, unknown>): void {
  bus.publish(makeEvent(EVENT.TOOL_CALLED, { tool: t, args }, demoId));
}

/** Build the RefundContext for the replay from the frozen seed (+ env overrides). */
function buildRefundContext(): RefundContext {
  const refundId = `re_sim_${Date.now()}`;
  return {
    refundId,
    orderId: seed.order.id,
    amount: seed.order.amount,
    currency: seed.order.currency,
    mode: 'simulated', // replay never calls Stripe; it is honestly simulated.
    customer: {
      id: seed.customer.id,
      name: seed.customer.name,
      email: config.demoCustomerEmail ?? seed.customer.email,
      whatsapp: config.demoCustomerWhatsApp ?? seed.customer.whatsapp,
    },
    etaDays: seed.order.etaDays,
    item: seed.order.item,
  };
}

const BEATS: Beat[] = [
  // The customer's message (mirrors what the presenter types as Ada).
  {
    after: 300,
    emit: (id) =>
      bus.publish(
        makeEvent(
          EVENT.AGENT_REASONING,
          {
            text:
              'Customer message received: "I want a refund for order 1024 — the navy linen dress, I was charged twice."',
            message: {
              role: 'user',
              text:
                'I want a refund for order 1024 — the navy linen dress, I was charged twice.',
              ts: Date.now(),
              messageType: null,
            },
          },
          id,
        ),
      ),
  },
  // Identify the customer.
  { after: 1400, emit: (id) => reasoning(id, 'Recognising customer: Ada Lovelace (cust_ada).') },
  { after: 900, emit: (id) => tool(id, 'lookup_customer', { id: 'cust_ada' }) },
  // Pull the order.
  { after: 1300, emit: (id, r) => reasoning(id, `Pulling order ${r.orderId} — ${r.item}, £${r.amount.toFixed(2)} ${r.currency}.`) },
  { after: 900, emit: (id, r) => tool(id, 'lookup_order', { orderId: r.orderId }) },
  // Verify the duplicate charge against policy.
  { after: 1400, emit: (id) => reasoning(id, 'Order record shows a duplicate charge for the same item and amount. Confirmed against refund policy: duplicate-charge disputes are eligible for a full refund of the duplicated amount.') },
  { after: 1100, emit: (id, r) => tool(id, 'check_refund_policy', { orderId: r.orderId, eligible: true }) },
  // Decide + call Stripe (simulated in replay).
  { after: 1500, emit: (id, r) => reasoning(id, `Eligible. Issuing a refund of £${r.amount.toFixed(2)} to the original payment method — confirmation will follow by email and WhatsApp.`) },
  { after: 900, emit: (id, r) => tool(id, 'issue_refund', { orderId: r.orderId, amount: r.amount, currency: r.currency }) },
  // Refund issued -> refund.confirmed. This mirrors EXACTLY what the live BFF
  // webhook emits when it catches + validates the refund. We deliberately do
  // NOT emit a `refund`-channel status here: the orchestrator's onRefundIssued
  // owns that status (it drives the StatusBoard "Refund" card from the same
  // stream as email/whatsapp). Emitting it here too would double-flip the card.
  {
    after: 1400,
    emit: (id, r) => {
      bus.publish(
        makeEvent(
          EVENT.REFUND_CONFIRMED,
          {
            refundId: r.refundId,
            orderId: r.orderId,
            amount: r.amount,
            currency: r.currency,
            mode: r.mode,
          },
          id,
        ),
      );
    },
  },
];

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

export interface ReplayResult {
  ok: boolean;
  reason?: string;
  demoId?: string;
  refundId?: string;
}

/**
 * Play the deterministic golden path. Resolves once the refund-confirmed beat
 * has fired and the orchestrator fan-out has been kicked off (email + WhatsApp
 * then stream their own status/sent events asynchronously on the same bus).
 *
 * Returns immediately with ok:false if replay is not armed or already running.
 */
export async function runReplay(): Promise<ReplayResult> {
  if (config.demoMode !== 'replay') {
    return { ok: false, reason: 'DEMO_MODE is not "replay" — refusing to fire during a live run.' };
  }
  if (isRunning()) {
    return { ok: false, reason: 'A replay is already in progress.' };
  }
  setRunning(true);
  try {
    const refund = buildRefundContext();
    const demoId = refund.refundId;

    for (const beat of BEATS) {
      await delay(beat.after);
      try {
        beat.emit(demoId, refund);
      } catch {
        // A single bad beat must never abort the run on stage.
      }
    }

    // Hand off to the REAL orchestrator so the email + WhatsApp confirmations
    // (and their status/sent events) are byte-identical to a live run. It is
    // fire-and-forget and emits on the same bus; we space it just after the
    // refund card lands so the cards flip in a readable order.
    await delay(600);
    onRefundIssued(refund);

    return { ok: true, demoId, refundId: refund.refundId };
  } finally {
    // Release the guard after the orchestrator fan-out has comfortably finished
    // (it is sub-second in stub mode) so a second replay can be triggered for a
    // re-run without a process restart.
    setTimeout(() => setRunning(false), 4000);
  }
}
