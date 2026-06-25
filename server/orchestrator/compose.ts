/**
 * server/orchestrator/compose.ts — confirmation copy + card encoding (Agent C owns)
 * ---------------------------------------------------------------------------------
 * Pure, dependency-free helpers. NO secrets, NO I/O. Used by email.ts +
 * whatsapp.ts to build the human-facing confirmation copy from a RefundContext,
 * and to encode a rich "card" onto the StatusEvent.detail string so the
 * dashboard (Agent A) can render the full composed content (subject / body /
 * message) without us inventing a new event shape (StatusEvent is frozen).
 *
 * Card encoding contract (Agent A reads this):
 *   StatusEvent.detail for the *card-bearing* status (the one we cap at — see
 *   below) is a string of the form:
 *
 *       "<short human summary> ::CARD:: <JSON>"
 *
 *   where <JSON> is one of EmailCard | WhatsAppCard (the `kind` field
 *   discriminates). A consumer that does not understand the card simply shows
 *   the leading human summary — the marker and everything after it is optional.
 *   Helper `parseCard(detail)` is provided for Agent A.
 */

import type { RefundContext, EmailMode, WhatsAppMode } from '@shared/types';

/** Marker that separates the human summary from the embedded card JSON. */
export const CARD_MARKER = ' ::CARD:: ';

export interface EmailCard {
  kind: 'email';
  to: string;
  subject: string;
  /** Plain-text body (what a no-HTML client would show). */
  text: string;
  /** Rendered HTML body for the dashboard "email sent" card. */
  html: string;
  /** Reflects how the email was handled: live send vs composed preview. */
  mode: EmailMode;
  /**
   * Honest delivery semantics for the chip:
   *  - 'sent-live'  : handed to a real SMTP relay (receipt = messageId)
   *  - 'composed'   : fully composed, NOT sent (no creds / no transport) — preview only
   */
  delivery: 'sent-live' | 'composed';
}

export interface WhatsAppCard {
  kind: 'whatsapp';
  to: string;
  /** The WhatsApp message body (what the customer would receive). */
  message: string;
  mode: WhatsAppMode;
  /**
   * Honest delivery semantics for the chip:
   *  - 'sent-live'   : real outbound WhatsApp send
   *  - 'agent-turn'  : delivered as the agent's closing conversation turn
   *  - 'composed'    : composed + shown as a dashboard card, NOT sent to a phone
   */
  delivery: 'sent-live' | 'agent-turn' | 'composed';
}

export type ConfirmationCard = EmailCard | WhatsAppCard;

/** Encode a human summary + card into a single StatusEvent.detail string. */
export function encodeCard(summary: string, card: ConfirmationCard): string {
  return `${summary}${CARD_MARKER}${JSON.stringify(card)}`;
}

/**
 * Decode a StatusEvent.detail back into {summary, card}. Safe on any string:
 * returns card=null when there is no embedded card. (Exported for Agent A.)
 */
export function parseCard(detail: string): {
  summary: string;
  card: ConfirmationCard | null;
} {
  const idx = detail.indexOf(CARD_MARKER);
  if (idx === -1) return { summary: detail, card: null };
  const summary = detail.slice(0, idx);
  const json = detail.slice(idx + CARD_MARKER.length);
  try {
    return { summary, card: JSON.parse(json) as ConfirmationCard };
  } catch {
    return { summary: detail, card: null };
  }
}

// ---------------------------------------------------------------------------
// Copy generation — single source of truth for confirmation wording.
// ---------------------------------------------------------------------------

/** Format a money amount in MAJOR units with its ISO currency, e.g. "£42.99". */
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
    }).format(amount);
  } catch {
    // Unknown currency code — fall back to a plain, honest rendering.
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/** A short, stable, human-friendly refund reference derived from the refundId. */
export function refundRef(refundId: string): string {
  return refundId;
}

export interface ComposedEmail {
  subject: string;
  text: string;
  html: string;
}

/** Compose the refund-confirmation email (subject + plain + html). */
export function composeEmail(ctx: RefundContext): ComposedEmail {
  const money = formatMoney(ctx.amount, ctx.currency);
  const ref = refundRef(ctx.refundId);
  const subject = `Your ${money} refund for order #${ctx.orderId} is on its way`;

  const text = [
    `Hi ${ctx.customer.name},`,
    ``,
    `Good news — we've issued your refund.`,
    ``,
    `  Order:        #${ctx.orderId} (${ctx.item})`,
    `  Refund amount: ${money}`,
    `  Refund ref:    ${ref}`,
    `  Arrives in:    up to ${ctx.etaDays} business day${ctx.etaDays === 1 ? '' : 's'}`,
    ``,
    `The money will be returned to your original payment method. You don't`,
    `need to do anything else. If it hasn't arrived after ${ctx.etaDays} business`,
    `day${ctx.etaDays === 1 ? '' : 's'}, just reply to this email and we'll chase it for you.`,
    ``,
    `Thanks for your patience,`,
    `The Support Team`,
  ].join('\n');

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f5f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
    <div style="max-width:520px;margin:0 auto;padding:32px 16px;">
      <div style="background:#ffffff;border-radius:14px;padding:28px 28px 24px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <p style="margin:0 0 16px;font-size:15px;">Hi ${escapeHtml(ctx.customer.name)},</p>
        <p style="margin:0 0 20px;font-size:15px;">Good news — we&rsquo;ve issued your refund. 🎉</p>
        <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 20px;">
          <tr><td style="padding:6px 0;color:#6b7280;">Order</td><td style="padding:6px 0;text-align:right;font-weight:600;">#${escapeHtml(ctx.orderId)} &middot; ${escapeHtml(ctx.item)}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Refund amount</td><td style="padding:6px 0;text-align:right;font-weight:700;font-size:18px;color:#0f9d58;">${escapeHtml(money)}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Refund reference</td><td style="padding:6px 0;text-align:right;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;">${escapeHtml(ref)}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Arrives in</td><td style="padding:6px 0;text-align:right;font-weight:600;">up to ${ctx.etaDays} business day${ctx.etaDays === 1 ? '' : 's'}</td></tr>
        </table>
        <p style="margin:0 0 16px;font-size:14px;color:#374151;">The money will be returned to your original payment method. You don&rsquo;t need to do anything else.</p>
        <p style="margin:0;font-size:14px;color:#374151;">Thanks for your patience,<br/>The Support Team</p>
      </div>
      <p style="text-align:center;color:#9ca3af;font-size:11px;margin:16px 0 0;">Refund confirmation &middot; ref ${escapeHtml(ref)}</p>
    </div>
  </body>
</html>`;

  return { subject, text, html };
}

/** Compose the WhatsApp confirmation message body. */
export function composeWhatsApp(ctx: RefundContext): string {
  const money = formatMoney(ctx.amount, ctx.currency);
  return [
    `✅ *Refund confirmed*`,
    ``,
    `Hi ${ctx.customer.name}, your *${money}* refund for order #${ctx.orderId} (${ctx.item}) has been issued.`,
    ``,
    `It'll arrive on your original payment method within ${ctx.etaDays} business day${ctx.etaDays === 1 ? '' : 's'}.`,
    `Ref: ${ctx.refundId}`,
    ``,
    `Thanks for your patience! 💙`,
  ].join('\n');
}

/** Minimal HTML-escape for interpolating untrusted-ish copy into the card. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
