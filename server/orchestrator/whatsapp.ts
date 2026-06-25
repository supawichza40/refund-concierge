/**
 * server/orchestrator/whatsapp.ts — WhatsApp confirmation channel (Agent C owns)
 * ------------------------------------------------------------------------------
 * Driven by config.whatsappMode ('live' | 'agent-turn' | 'card-stub'), mapped
 * to the frozen WhatsAppMode union ('live' | 'agent-turn' | 'card-fallback').
 *
 *   • 'card-stub'  (DEFAULT, cannot-crash) → WhatsAppMode 'card-fallback'.
 *       Compose the message and emit it to the dashboard as a WhatsApp-style
 *       card (full body in StatusEvent.detail via encodeCard). NOTHING is sent
 *       to a real phone — the card chip says `delivery: 'composed'`. We cap at
 *       `sent` ("composed & queued"), never `delivered`.
 *
 *   • 'agent-turn' → WhatsAppMode 'agent-turn'.
 *       The confirmation is intended to be delivered as the BimpeAI agent's
 *       CLOSING CONVERSATION TURN (i.e. the agent literally says the
 *       confirmation to the customer in the connected WhatsApp/web chat).
 *       The running Node app does not own the conversation socket, so it
 *       cannot push the turn itself — see deliverAsAgentTurn() for the clean
 *       hook + the workflow/system-prompt instruction to wire at demo time.
 *       Until that hook is wired we still compose + emit the card so the
 *       dashboard lights up; chip = `delivery: 'agent-turn'`.
 *
 *   • 'live' → WhatsAppMode 'live'.
 *       Real outbound WhatsApp send. NO provider is wired (no Twilio key, and
 *       WhatsApp is dashboard-connect-only today), so sendViaProvider() is a
 *       documented hook that currently returns null and we fall back to the
 *       composed card. Wire a real provider there to upgrade.
 *
 * ----------------------------------------------------------------------------
 * HOW TO MAKE WHATSAPP REAL:
 *   OPTION A — agent-turn (recommended for the demo, no provider needed):
 *     1. Connect WhatsApp in the BimpeAI dashboard (Channels → WhatsApp).
 *     2. Set WHATSAPP_MODE=agent-turn in env.
 *     3. Add to the BimpeAI agent's workflow/system prompt:
 *          "After a refund is issued, close the conversation by sending the
 *           customer a confirmation: amount, order id, refund ref, and the ETA.
 *           Keep it to one short WhatsApp-style message."
 *        The confirmation then arrives in-thread as the agent's last turn.
 *     4. (Optional) wire deliverAsAgentTurn() to POST the composed message back
 *        into the BimpeAI webchat session if you want the orchestrator to drive
 *        it instead of relying on the agent's own prompt.
 *
 *   OPTION B — live provider: implement sendViaProvider() against a WhatsApp
 *     Business API / Twilio number and set WHATSAPP_MODE=api (→ 'live').
 * ----------------------------------------------------------------------------
 */

import type { RefundContext, WhatsAppMode } from '@shared/types';
import type { AppConfig } from '@server/config';
import { composeWhatsApp, encodeCard, type WhatsAppCard } from './compose';

/** Result returned to the orchestrator so it can emit the right events. */
export interface WhatsAppResult {
  /** Frozen WhatsAppMode union for the WHATSAPP_SENT payload + status. */
  mode: WhatsAppMode;
  /** Rich detail string (human summary + embedded card) for StatusEvent. */
  detail: string;
  /** Short human summary for the `pending` status. */
  pendingDetail: string;
  /** True iff the message left our system toward a real WhatsApp endpoint. */
  realSend: boolean;
}

/** Map the config union to the frozen WhatsAppMode union. */
function resolveMode(configMode: AppConfig['whatsappMode']): WhatsAppMode {
  return configMode === 'card-stub' ? 'card-fallback' : configMode;
}

/**
 * HOOK — deliver the confirmation as the BimpeAI agent's closing turn.
 * The Node app does not own the conversation socket, so this is a no-op hook
 * by default. Wire it to POST `message` back into the BimpeAI webchat session
 * (server/bff owns the BimpeAI client) if you want the orchestrator to drive
 * the closing turn instead of the agent's own workflow prompt.
 *
 * @returns true if the turn was actually delivered, false if not wired.
 */
async function deliverAsAgentTurn(
  _ctx: RefundContext,
  _message: string,
): Promise<boolean> {
  // TODO(demo): call the BimpeAI webchat "send message" endpoint here using the
  // session id on the BFF. Left unwired so default behaviour cannot crash.
  return false;
}

/**
 * HOOK — real outbound WhatsApp send via a provider (WhatsApp Business API /
 * Twilio). No key is configured today, so this returns null and the caller
 * falls back to the composed card. Implement to upgrade WHATSAPP_MODE=live.
 *
 * @returns a provider receipt id on success, or null if not wired.
 */
async function sendViaProvider(
  _ctx: RefundContext,
  _message: string,
): Promise<string | null> {
  return null;
}

/**
 * Build the WhatsApp confirmation. Always composes the message; the delivery
 * path depends on config.whatsappMode. Never fakes delivery to a real phone.
 */
export async function buildWhatsAppConfirmation(
  ctx: RefundContext,
  configMode: AppConfig['whatsappMode'],
): Promise<WhatsAppResult> {
  const mode = resolveMode(configMode);
  const message = composeWhatsApp(ctx);

  if (mode === 'live') {
    const receipt = await sendViaProvider(ctx, message);
    if (receipt) {
      return result(ctx, message, 'live', 'sent-live', true,
        `WhatsApp sent to ${ctx.customer.whatsapp} (live)`,
        `Sending WhatsApp to ${ctx.customer.whatsapp}`);
    }
    // No provider wired → honest fallback to a composed card.
    return result(ctx, message, 'card-fallback', 'composed', false,
      `WhatsApp composed for ${ctx.customer.whatsapp} (no provider — preview)`,
      `Composing WhatsApp for ${ctx.customer.whatsapp}`);
  }

  if (mode === 'agent-turn') {
    const delivered = await deliverAsAgentTurn(ctx, message);
    return result(ctx, message, 'agent-turn', 'agent-turn', delivered,
      delivered
        ? `WhatsApp delivered as the agent's closing turn`
        : `WhatsApp ready as the agent's closing turn (delivered by the BimpeAI agent prompt)`,
      `Preparing WhatsApp closing turn for ${ctx.customer.whatsapp}`);
  }

  // DEFAULT: card-fallback — composed, shown on the dashboard, not sent.
  return result(ctx, message, 'card-fallback', 'composed', false,
    `WhatsApp composed for ${ctx.customer.whatsapp} (preview — not sent)`,
    `Composing WhatsApp for ${ctx.customer.whatsapp}`);
}

/** Small builder to keep the branches above tidy and consistent. */
function result(
  ctx: RefundContext,
  message: string,
  mode: WhatsAppMode,
  delivery: WhatsAppCard['delivery'],
  realSend: boolean,
  sentSummary: string,
  pendingDetail: string,
): WhatsAppResult {
  const card: WhatsAppCard = {
    kind: 'whatsapp',
    to: ctx.customer.whatsapp,
    message,
    mode,
    delivery,
  };
  return {
    mode,
    realSend,
    pendingDetail,
    detail: encodeCard(sentSummary, card),
  };
}
