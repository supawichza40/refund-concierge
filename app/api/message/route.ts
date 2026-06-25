/**
 * app/api/message/route.ts — send a turn to the BimpeAI agent (Agent B owns)
 * ------------------------------------------------------------------
 * POST /api/message  { text: string }  ->  { reply, conversationId, refundTriggered }
 *
 * Calls our demo agent (BIMPE_AGENT_ID) via the webchat client, mirrors both
 * the user turn and the assistant reply onto the bus as agent.reasoning events
 * (so the ReasoningTrail lights up over SSE), and — if the reply reaches the
 * refund decision (deterministic marker / phrase) — auto-triggers the refund.
 *
 * Falls back to the canned stub client automatically when no API key is set, so
 * the route always returns a usable reply and the demo never crashes.
 */

import { NextResponse } from 'next/server';

import { sendMessage } from '@server/bff/bimpe';
import { bus } from '@server/bff/bus';
import { issueRefund, replyTriggersRefund, stripRefundMarker } from '@server/bff/refund';
import { ensureSession, setConversationId } from '@server/bff/state';
import { EVENT, makeEvent } from '@shared/events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface MessageBody {
  text?: unknown;
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: MessageBody;
  try {
    body = (await req.json()) as MessageBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) {
    return NextResponse.json({ error: 'Missing "text"' }, { status: 400 });
  }

  const session = ensureSession();
  const demoId = session.demoId;

  // Mirror the user utterance onto the trail.
  bus.publish(
    makeEvent(
      EVENT.AGENT_REASONING,
      { text, message: { role: 'user', text, ts: Date.now(), messageType: null } },
      demoId,
    ),
  );

  let reply: string;
  let conversationId: string;
  try {
    const result = await sendMessage(text, session.channelUserId);
    conversationId = result.conversationId;
    reply = result.reply || "I'm processing your request.";
    setConversationId(conversationId);
  } catch (err) {
    // Live call failed — surface a non-fatal error and keep the demo alive.
    bus.publish(
      makeEvent(EVENT.ERROR, { message: `Agent call failed: ${String(err)}` }, demoId),
    );
    return NextResponse.json(
      { error: 'Agent call failed', detail: String(err) },
      { status: 502 },
    );
  }

  const cleanReply = stripRefundMarker(reply);

  // Mirror the assistant reply onto the trail.
  bus.publish(
    makeEvent(
      EVENT.AGENT_REASONING,
      {
        text: cleanReply,
        message: { role: 'assistant', text: cleanReply, ts: Date.now(), messageType: null },
      },
      demoId,
    ),
  );

  // Auto-trigger the refund when the agent reaches the decision.
  let refundTriggered = false;
  if (replyTriggersRefund(reply)) {
    refundTriggered = true;
    bus.publish(
      makeEvent(
        EVENT.TOOL_CALLED,
        { tool: 'issue_refund', args: { orderId: session.seed.order.id } },
        demoId,
      ),
    );
    // Fire the refund flow; don't block the reply on confirmation fan-out.
    void issueRefund().catch((err: unknown) => {
      bus.publish(
        makeEvent(EVENT.ERROR, { channel: 'refund', message: String(err) }, demoId),
      );
    });
  }

  return NextResponse.json({ reply: cleanReply, conversationId, refundTriggered });
}
