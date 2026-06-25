/**
 * server/orchestrator/index.ts — Confirmation Orchestrator (Agent C owns; implements)
 * -----------------------------------------------------------------------------------
 * Contract (frozen): the BFF (Agent B) calls onRefundIssued(ctx) after it
 * catches + validates a refund. The orchestrator fans out the email + WhatsApp
 * confirmations on INDEPENDENT promises (one failing never blocks the other),
 * emitting status / email.sent / whatsapp.sent / error events on the SAME bus
 * the SSE hub reads.
 *
 * This file ships the INTERFACE + a SAFE STUB so the app compiles and the
 * golden path lights up end-to-end (status -> sent -> delivered) even before
 * Agent C wires real Gmail + WhatsApp. Agent C replaces the stub bodies in
 * email.ts / whatsapp.ts and the fan-out here.
 */

import { bus } from '@server/bff/bus';
import { config } from '@server/config';
import { EVENT, makeEvent, type StatusEvent } from '@shared/events';
import type {
  RefundContext,
  EmailMode,
  WhatsAppMode,
} from '@shared/types';

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
 * STUB email send. Agent C replaces with server/orchestrator/email.ts
 * (Claude Gmail MCP send when config.emailLive, else mode "skipped").
 */
async function sendEmailConfirmation(ctx: RefundContext): Promise<void> {
  const mode: EmailMode = config.emailLive ? 'live' : 'skipped';
  emitStatus(ctx, 'email', 'pending', mode, `Preparing email to ${ctx.customer.email}`);
  // Real send happens here in module C.
  emitStatus(ctx, 'email', 'sent', mode, `Email queued to ${ctx.customer.email}`);
  bus.publish(
    makeEvent(
      EVENT.EMAIL_SENT,
      { refundId: ctx.refundId, to: ctx.customer.email, mode },
      ctx.refundId,
    ),
  );
  emitStatus(ctx, 'email', 'delivered', mode, `Refund confirmation emailed to ${ctx.customer.email}`);
}

/**
 * STUB WhatsApp send. Agent C replaces with server/orchestrator/whatsapp.ts.
 * Default mode is 'card-fallback' (dashboard card) unless upgraded via config.
 */
async function sendWhatsAppConfirmation(ctx: RefundContext): Promise<void> {
  const mode: WhatsAppMode =
    config.whatsappMode === 'card-stub' ? 'card-fallback' : config.whatsappMode;
  emitStatus(ctx, 'whatsapp', 'pending', mode, `Preparing WhatsApp to ${ctx.customer.whatsapp}`);
  emitStatus(ctx, 'whatsapp', 'sent', mode, `WhatsApp queued to ${ctx.customer.whatsapp}`);
  bus.publish(
    makeEvent(
      EVENT.WHATSAPP_SENT,
      { refundId: ctx.refundId, to: ctx.customer.whatsapp, mode },
      ctx.refundId,
    ),
  );
  emitStatus(ctx, 'whatsapp', 'delivered', mode, `Refund confirmation sent to ${ctx.customer.whatsapp}`);
}

/**
 * Fire-and-forget entry point. The BFF calls this after refund.confirmed.
 * Email and WhatsApp run on independent promises; a rejection on one is
 * reported as an `error` event and never blocks the other.
 *
 * Named onRefundIssued per the foundation task; runConfirmations is kept as an
 * alias for the name used in ARCHITECTURE.md so either import works.
 */
export function onRefundIssued(ctx: RefundContext): void {
  void sendEmailConfirmation(ctx).catch((err: unknown) => {
    bus.publish(
      makeEvent(
        EVENT.ERROR,
        { channel: 'email', refundId: ctx.refundId, message: String(err) },
        ctx.refundId,
      ),
    );
    emitStatus(ctx, 'email', 'failed', config.emailLive ? 'live' : 'skipped', 'Email send failed');
  });

  void sendWhatsAppConfirmation(ctx).catch((err: unknown) => {
    bus.publish(
      makeEvent(
        EVENT.ERROR,
        { channel: 'whatsapp', refundId: ctx.refundId, message: String(err) },
        ctx.refundId,
      ),
    );
    emitStatus(ctx, 'whatsapp', 'failed', 'card-fallback', 'WhatsApp send failed');
  });
}

/** Alias matching ARCHITECTURE.md's runConfirmations(ctx) name. */
export const runConfirmations = onRefundIssued;
