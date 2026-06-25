/**
 * server/bff/bimpe.ts — BimpeAI webchat client (Agent B owns; expands this)
 * -------------------------------------------------------------------------
 * VERIFIED platform reality (build to THIS):
 *   - Live, scriptable path is WEBCHAT:
 *       POST {base}/console/agents/{agentId}/conversations/messages
 *       body: { message, channel_type:"webchat", channel_user_id:<uuid>, is_test_channel:true }
 *       -> 201, synchronous reply at data.message (role "assistant").
 *   - Transcript:
 *       GET {base}/console/agents/{agentId}/conversations/{conversationId}/messages
 *   - Response is FINAL-TEXT-centric. message_type MAY be null. There is NO
 *     guaranteed tool-call/trace array — build the reasoning trail from the
 *     transcript + our own orchestrator events, NOT from a BimpeAI trace API.
 *
 * SERVER-ONLY. Reads the API key from server/config.ts. The key never reaches
 * the browser. If no key is configured, every call returns a deterministic
 * canned reply so the demo (and tests) run fully offline — the "cannot crash"
 * default mode.
 *
 * This file ships a WORKING stub + the real fetch wiring behind `hasBimpeKey`.
 * Agent B hardens error handling, retries, and agent/KB creation.
 */

import { config, hasBimpeKey } from '@server/config';
import type { ConversationMessage } from '@shared/types';

export interface SendMessageResult {
  conversationId: string;
  reply: string;
  /** The full assistant message, if you want messageType etc. (may be null). */
  raw?: unknown;
}

export interface BimpeClient {
  sendMessage(agentId: string, userId: string, text: string): Promise<SendMessageResult>;
  getTranscript(agentId: string, conversationId: string): Promise<ConversationMessage[]>;
}

// ---------------------------------------------------------------------------
// Canned-reply stub (used when no BIMPEAI_API_KEY is present)
// ---------------------------------------------------------------------------

function cannedReply(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('refund')) {
    return (
      "I've found order #1024 for a navy linen dress at £42.99. I can see it was " +
      'charged twice. I\'ll issue a refund for the duplicate charge now — you\'ll get ' +
      'a confirmation by email and WhatsApp shortly.'
    );
  }
  return "Hi, I'm your refund concierge. Tell me your order number and what went wrong.";
}

const stubClient: BimpeClient = {
  async sendMessage(_agentId, _userId, text) {
    return {
      conversationId: `conv_stub_${Date.now()}`,
      reply: cannedReply(text),
    };
  },
  async getTranscript(_agentId, _conversationId) {
    return [
      { role: 'user', text: 'I want a refund for order 1024.', ts: Date.now() - 2000, messageType: null },
      { role: 'assistant', text: cannedReply('refund'), ts: Date.now(), messageType: null },
    ];
  },
};

// ---------------------------------------------------------------------------
// Live webchat client
// ---------------------------------------------------------------------------

function authHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.bimpeApiKey}`,
  };
}

const liveClient: BimpeClient = {
  async sendMessage(agentId, userId, text) {
    const url = `${config.bimpeBaseUrl}/console/agents/${agentId}/conversations/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        message: text,
        channel_type: 'webchat',
        channel_user_id: userId,
        is_test_channel: true,
      }),
    });
    if (!res.ok) {
      throw new Error(`BimpeAI sendMessage failed: ${res.status} ${res.statusText}`);
    }
    const json = (await res.json()) as {
      data?: { message?: string; conversation_id?: string; conversationId?: string };
    };
    const data = json.data ?? {};
    return {
      conversationId: data.conversation_id ?? data.conversationId ?? `conv_${Date.now()}`,
      reply: data.message ?? '',
      raw: json,
    };
  },

  async getTranscript(agentId, conversationId) {
    const url = `${config.bimpeBaseUrl}/console/agents/${agentId}/conversations/${conversationId}/messages`;
    const res = await fetch(url, { method: 'GET', headers: authHeaders() });
    if (!res.ok) {
      throw new Error(`BimpeAI getTranscript failed: ${res.status} ${res.statusText}`);
    }
    const json = (await res.json()) as {
      data?: Array<{ role?: string; message?: string; content?: string; message_type?: string | null; created_at?: string }>;
    };
    const rows = json.data ?? [];
    return rows.map((r): ConversationMessage => ({
      role: (r.role as ConversationMessage['role']) ?? 'assistant',
      text: r.message ?? r.content ?? '',
      ts: r.created_at ? Date.parse(r.created_at) : Date.now(),
      messageType: r.message_type ?? null,
    }));
  },
};

/** The active client: live if a key is configured, otherwise the canned stub. */
export const bimpe: BimpeClient = hasBimpeKey ? liveClient : stubClient;

/** Convenience wrappers so callers don't have to thread the singleton. */
export function sendMessage(agentId: string, userId: string, text: string): Promise<SendMessageResult> {
  return bimpe.sendMessage(agentId, userId, text);
}

export function getTranscript(agentId: string, conversationId: string): Promise<ConversationMessage[]> {
  return bimpe.getTranscript(agentId, conversationId);
}
