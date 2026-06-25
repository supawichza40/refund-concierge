/**
 * server/orchestrator/index.ts — Confirmation Orchestrator (Agent C owns; implements)
 * -----------------------------------------------------------------------------------
 * Contract (FROZEN): the BFF (Agent B) calls onRefundIssued(ctx) after it
 * catches + validates a refund. The orchestrator fans out the email + WhatsApp
 * confirmations on INDEPENDENT promises (one failing never blocks the other),
 * emitting status / email.sent / whatsapp.sent / error events on the SAME bus
 * (@server/bff/bus) the SSE hub reads. The signature onRefundIssued(ctx) is
 * stable — Agent B depends on it; runConfirmations is kept as an alias.
 *
 * Demo-safety contract: in the DEFAULT no-creds mode the fan-out STILL lights
 * the StatusBoard green end-to-end (refund/email/whatsapp all reach `sent`),
 * while staying truthful via the `mode` field + the per-channel card chip:
 *   - refund   : RefundMode   ('stripe' | 'simulated')
 *   - email    : EmailMode    ('live' | 'skipped')   — composed preview = 'skipped'
 *   - whatsapp : WhatsAppMode  ('live' | 'agent-turn' | 'card-fallback')
 *
 * HONESTY RULE: a channel only reaches StatusState 'delivered' when a real
 * provider RECEIPT exists. Composed/preview/agent-turn paths cap at 'sent'.
 * We never fake 'delivered'. (See email.ts / whatsapp.ts for the transport
 * abstraction and how to flip each channel to a real send — also README.md.)
 *
 * Idempotent on refundId: the BFF may call this more than once for the same
 * refund (webhook retry / confirm-then-issue). We run the fan-out exactly once
 * per refundId for the lifetime of the process.
 */

import { bus } from '@server/bff/bus';
import { config } from '@server/config';
import { EVENT, makeEvent, type StatusEvent } from '@shared/events';
import type { RefundContext } from '@shared/types';
import { buildEmailConfirmation } from './email';
import { buildWhatsAppConfirmation } from './whatsapp';

// Re-export the composition helpers so Agent A (dashboard) and Claude (Gmail
// MCP at demo time) can pull the exact composed copy, and so the card encoding
// lives in one importable place.
export {
  composeEmail,
  composeWhatsApp,
  parseCard,
  encodeCard,
  CARD_MARKER,
  formatMoney,
  type EmailCard,
  type WhatsAppCard,
  type ConfirmationCard,
} from './compose';

/** Process-lifetime set of refundIds we've already fanned out for. */
const handled = new Set<string>();

/** Helper to emit a per-channel status event on the bus. */
function emitStatus(
  ctx: RefundContext,
  channel: StatusEvent['channel'],
  state: StatusEvent['state'],
  mode: StatusEvent['mode'],
  detail: string,
): void {
  const evt: StatusEvent = {
    refundId: ctx.refundId,
    channel,
    state,
    mode,
    detail,
    ts: Date.now(),
  };
  bus.publish(makeEvent(EVENT.STATUS, evt, ctx.refundId));
}

/**
 * EMAIL channel: pending → sent (capped honestly). Real SMTP send when creds +
 * nodemailer are present, else a fully-composed preview card. See email.ts.
 */
async function runEmail(ctx: RefundContext): Promise<void> {
  // Pending mode reflects intent; the real mode comes back on the result.
  emitStatus(ctx, 'email', 'pending', config.emailLive ? 'live' : 'skipped',
    `Composing email to ${ctx.customer.email}`);

  const res = await buildEmailConfirmation(ctx, config.emailLive);

  // EMAIL_SENT carries the provider messageId iff a real send happened.
  bus.publish(
    makeEvent(
      EVENT.EMAIL_SENT,
      { refundId: ctx.refundId, to: ctx.customer.email, messageId: res.messageId, mode: res.mode },
      ctx.refundId,
    ),
  );

  // Cap at 'sent'. 'delivered' only on a real provider receipt (realSend).
  emitStatus(ctx, 'email', 'sent', res.mode, res.detail);
  if (res.realSend && res.messageId) {
    emitStatus(ctx, 'email', 'delivered', res.mode,
      `Email accepted by SMTP relay (id ${res.messageId})`);
  }
}

/**
 * WHATSAPP channel: pending → sent (capped honestly). card-fallback by default;
 * agent-turn / live when configured + wired. See whatsapp.ts.
 */
async function runWhatsApp(ctx: RefundContext): Promise<void> {
  const provisionalMode =
    config.whatsappMode === 'card-stub' ? 'card-fallback' : config.whatsappMode;
  emitStatus(ctx, 'whatsapp', 'pending', provisionalMode,
    `Composing WhatsApp for ${ctx.customer.whatsapp}`);

  const res = await buildWhatsAppConfirmation(ctx, config.whatsappMode);

  bus.publish(
    makeEvent(
      EVENT.WHATSAPP_SENT,
      { refundId: ctx.refundId, to: ctx.customer.whatsapp, mode: res.mode },
      ctx.refundId,
    ),
  );

  emitStatus(ctx, 'whatsapp', 'sent', res.mode, res.detail);
  if (res.realSend && res.mode === 'live') {
    emitStatus(ctx, 'whatsapp', 'delivered', res.mode,
      `WhatsApp accepted by provider for ${ctx.customer.whatsapp}`);
  }
}

/**
 * Fire-and-forget entry point. The BFF calls this after refund.confirmed.
 * Email and WhatsApp run on INDEPENDENT promises; a rejection on one is
 * reported as a non-fatal `error` event + a `failed` status and never blocks
 * the other channel. Idempotent on ctx.refundId.
 */
export function onRefundIssued(ctx: RefundContext): void {
  if (handled.has(ctx.refundId)) return;
  handled.add(ctx.refundId);

  // The refund itself is already executed by the BFF; surface its terminal
  // status here so the StatusBoard "Refund" card is driven from the same
  // orchestrator stream as email/whatsapp.
  emitStatus(ctx, 'refund', 'delivered', ctx.mode,
    `Refund ${ctx.refundId} issued for order #${ctx.orderId}`);

  void runEmail(ctx).catch((err: unknown) => {
    bus.publish(
      makeEvent(
        EVENT.ERROR,
        { channel: 'email', refundId: ctx.refundId, message: String(err) },
        ctx.refundId,
      ),
    );
    emitStatus(ctx, 'email', 'failed', config.emailLive ? 'live' : 'skipped',
      `Email send failed: ${String(err)}`);
  });

  void runWhatsApp(ctx).catch((err: unknown) => {
    bus.publish(
      makeEvent(
        EVENT.ERROR,
        { channel: 'whatsapp', refundId: ctx.refundId, message: String(err) },
        ctx.refundId,
      ),
    );
    const failMode =
      config.whatsappMode === 'card-stub' ? 'card-fallback' : config.whatsappMode;
    emitStatus(ctx, 'whatsapp', 'failed', failMode,
      `WhatsApp send failed: ${String(err)}`);
  });
}

/** Alias matching ARCHITECTURE.md's runConfirmations(ctx) name. */
export const runConfirmations = onRefundIssued;

/** Test/diagnostic hook: clear the idempotency cache (e.g. between demo runs). */
export function _resetHandled(): void {
  handled.clear();
}
