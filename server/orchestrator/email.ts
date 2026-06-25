/**
 * server/orchestrator/email.ts — email confirmation channel (Agent C owns)
 * -------------------------------------------------------------------------
 * TRANSPORT-ABSTRACTED. Two paths, auto-selected at runtime:
 *
 *   1. REAL SEND (nodemailer over SMTP) — used ONLY when BOTH are true:
 *        a) SMTP creds are present in env (see smtpFromEnv() below), AND
 *        b) the `nodemailer` package is installed (dynamic import; optional dep).
 *      On success we emit EMAIL_SENT with a real provider messageId and the
 *      status caps at `sent` (we never claim `delivered` without a real
 *      delivery receipt — SMTP acceptance is "sent", not "delivered").
 *
 *   2. COMPOSED PREVIEW (DEFAULT, no creds) — we fully compose the email
 *      (subject + plain + html) and emit it to the dashboard as a rendered
 *      "email sent" card via StatusEvent.detail (see compose.ts encodeCard).
 *      EmailMode is the honest frozen value `skipped` (no real send happened);
 *      the card's `delivery: 'composed'` chip says so plainly. We cap at `sent`
 *      meaning "composed & queued for the operator", never `delivered`.
 *
 * ----------------------------------------------------------------------------
 * HOW TO FLIP TO A REAL SEND (two options — pick one):
 *
 *   OPTION A — SMTP (fully automatic, no code change):
 *     Set these env vars (e.g. a Gmail account + App Password) and `npm i
 *     nodemailer`:
 *       SMTP_HOST=smtp.gmail.com
 *       SMTP_PORT=465
 *       SMTP_USER=you@gmail.com
 *       SMTP_PASS=<16-char Gmail App Password>     # NOT your login password
 *       SMTP_FROM="Refunds <you@gmail.com>"        # optional; defaults to SMTP_USER
 *       SMTP_SECURE=true                            # optional; auto-true for port 465
 *     The next refund will send a REAL email. No other change needed.
 *
 *   OPTION B — Claude Gmail MCP at demo time (the running Node app CANNOT call
 *     the MCP itself). Run the demo in COMPOSED mode, read the composed
 *     subject/text/html off the dashboard card (or call composeEmail(ctx)), and
 *     have Claude send it via mcp__claude_ai_Gmail__create_draft /
 *     the Gmail send tool. The composed copy is byte-for-byte what gets sent.
 * ----------------------------------------------------------------------------
 */

import type { RefundContext, EmailMode } from '@shared/types';
import { composeEmail, encodeCard, type EmailCard } from './compose';

/** Result returned to the orchestrator so it can emit the right events. */
export interface EmailResult {
  /** Frozen EmailMode union: 'live' (real send attempted) | 'skipped'. */
  mode: EmailMode;
  /** Provider message id when a real send succeeded; undefined otherwise. */
  messageId?: string;
  /** Rich detail string (human summary + embedded card) for StatusEvent. */
  detail: string;
  /** Short human summary for the `pending` status. */
  pendingDetail: string;
  /** True iff a real email was handed to an SMTP relay. */
  realSend: boolean;
}

/** Minimal structural type for the optional nodemailer dependency. */
interface NodemailerLike {
  createTransport(opts: Record<string, unknown>): {
    sendMail(msg: Record<string, unknown>): Promise<{ messageId?: string }>;
  };
}

interface SmtpCreds {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

/** Read SMTP creds from env; returns null if not fully configured. */
function smtpFromEnv(): SmtpCreds | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !user || !pass) return null;
  const port = Number(process.env.SMTP_PORT?.trim() || '465');
  const secure =
    process.env.SMTP_SECURE?.trim().toLowerCase() === 'true' || port === 465;
  const from = process.env.SMTP_FROM?.trim() || user;
  return { host, port, secure, user, pass, from };
}

/**
 * Attempt a real SMTP send. Returns the messageId on success, or null if the
 * nodemailer package isn't installed (so the caller falls back to composed).
 * Throws only on an actual send failure (network/auth) — the orchestrator
 * turns that into a non-fatal `error` event + a `failed` status.
 */
async function trySmtpSend(
  ctx: RefundContext,
  creds: SmtpCreds,
  composed: { subject: string; text: string; html: string },
): Promise<string | null> {
  let nodemailer: NodemailerLike;
  try {
    // Optional dependency. The specifier is computed (not a string literal) so
    // the TS compiler does not try to resolve `nodemailer`'s types at build
    // time — the app must typecheck and run WITHOUT the package installed. At
    // runtime, if it's absent the import throws and we fall back to composed.
    const moduleName = ['node', 'mailer'].join('');
    const mod: unknown = await import(/* webpackIgnore: true */ moduleName);
    nodemailer =
      ((mod as { default?: unknown }).default ?? mod) as NodemailerLike;
  } catch {
    return null; // package not installed → caller uses composed preview
  }
  const transport = nodemailer.createTransport({
    host: creds.host,
    port: creds.port,
    secure: creds.secure,
    auth: { user: creds.user, pass: creds.pass },
  });
  const info = await transport.sendMail({
    from: creds.from,
    to: ctx.customer.email,
    subject: composed.subject,
    text: composed.text,
    html: composed.html,
  });
  return info.messageId ?? `smtp_${Date.now()}`;
}

/**
 * Build the email confirmation. Always composes the copy; sends for real iff
 * SMTP creds + nodemailer are both available. Never fakes delivery.
 *
 * @param emailLive  config.emailLive — when false, we never even attempt SMTP.
 */
export async function buildEmailConfirmation(
  ctx: RefundContext,
  emailLive: boolean,
): Promise<EmailResult> {
  const composed = composeEmail(ctx);
  const creds = emailLive ? smtpFromEnv() : null;

  if (creds) {
    const messageId = await trySmtpSend(ctx, creds, composed);
    if (messageId) {
      const card: EmailCard = {
        kind: 'email',
        to: ctx.customer.email,
        subject: composed.subject,
        text: composed.text,
        html: composed.html,
        mode: 'live',
        delivery: 'sent-live',
      };
      return {
        mode: 'live',
        messageId,
        realSend: true,
        pendingDetail: `Sending email to ${ctx.customer.email} via SMTP`,
        detail: encodeCard(
          `Email sent to ${ctx.customer.email} (live SMTP)`,
          card,
        ),
      };
    }
    // creds present but nodemailer missing → fall through to composed.
  }

  // DEFAULT path: composed preview, honestly NOT sent.
  const card: EmailCard = {
    kind: 'email',
    to: ctx.customer.email,
    subject: composed.subject,
    text: composed.text,
    html: composed.html,
    mode: 'skipped',
    delivery: 'composed',
  };
  return {
    mode: 'skipped',
    realSend: false,
    pendingDetail: `Composing email to ${ctx.customer.email}`,
    detail: encodeCard(
      `Email composed for ${ctx.customer.email} (preview — not sent)`,
      card,
    ),
  };
}
