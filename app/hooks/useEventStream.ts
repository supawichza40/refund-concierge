'use client';

/**
 * app/hooks/useEventStream.ts — Agent A (web/UI owner)
 * ---------------------------------------------------------------------------
 * The single source of truth for everything the dashboard renders. It owns:
 *
 *   1. The SSE connection to GET /api/events (auto-reconnect, heartbeat-aware).
 *   2. A reducer that folds the frozen DemoEvent stream into one `DemoState`
 *      the four panels consume — channels (Refund/Email/WhatsApp), the
 *      reasoning trail, the transcript, and the wow-metric timer.
 *   3. The command side: startSession() (POST /api/session/start) and
 *      sendMessage() (POST /api/message {text}) — the dashboard SENDS via plain
 *      POST and only CONSUMES via SSE, per the architecture contract.
 *
 * Contracts are imported from @shared/* and never redefined here.
 *
 * NOTE on the wow-metric clock: t0 is armed on the FIRST user message
 * (sendMessage), per ARCHITECTURE §3.1. The timer stops when all three channels
 * reach `delivered` (the last confirmation), per §3.8.
 */

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import {
  EVENT,
  type DemoEvent,
  type EventName,
  type AgentReasoningPayload,
  type ToolCalledPayload,
  type RefundConfirmedPayload,
  type EmailSentPayload,
  type WhatsAppSentPayload,
  type ErrorPayload,
} from '@shared/events';
import type {
  StatusEvent,
  StatusState,
  StatusChannel,
  ConversationMessage,
  PublicFlags,
  DemoSeed,
  RefundMode,
  EmailMode,
  WhatsAppMode,
} from '@shared/types';

// ---------------------------------------------------------------------------
// Derived view-model shapes the panels render (internal, not part of the wire
// contract — purely how the hook hands state to components).
// ---------------------------------------------------------------------------

export type ConnState = 'idle' | 'connecting' | 'live' | 'reconnecting';

/** One row in the StatusBoard. */
export interface ChannelStatus {
  channel: StatusChannel;
  state: StatusState;
  /** Mode chip text source; narrowed per channel by the component. */
  mode?: RefundMode | EmailMode | WhatsAppMode;
  /** Most recent human-readable detail (e.g. "sent to +44…"). */
  detail?: string;
  /** Epoch ms of the last transition (drives motion / relative timing). */
  ts?: number;
}

/** One entry in the ReasoningTrail. */
export interface TrailStep {
  id: string;
  kind: 'reasoning' | 'tool' | 'milestone';
  text: string;
  /** For tool steps. */
  tool?: string;
  ts: number;
}

/** A talk-panel message (UI mirror of ConversationMessage + local pending). */
export interface ChatMessage extends ConversationMessage {
  id: string;
  pending?: boolean;
}

export interface DemoState {
  conn: ConnState;
  /** Session flags from /api/session/start (drives mode chips + badges). */
  flags: PublicFlags | null;
  seed: DemoSeed | null;
  /** Wow-metric clock. */
  t0: number | null;
  tDone: number | null;
  /** The three StatusBoard channels, always present so cards render empty-state. */
  channels: Record<StatusChannel, ChannelStatus>;
  trail: TrailStep[];
  messages: ChatMessage[];
  /** Last non-fatal error surfaced from an `error` event or a failed POST. */
  lastError: string | null;
  /** Monotonic counter so the timer component can re-tick without new events. */
  receivedAt: number;
}

const CHANNELS: StatusChannel[] = ['refund', 'email', 'whatsapp'];

function freshChannels(): Record<StatusChannel, ChannelStatus> {
  return {
    refund: { channel: 'refund', state: 'pending' },
    email: { channel: 'email', state: 'pending' },
    whatsapp: { channel: 'whatsapp', state: 'pending' },
  };
}

function initialState(): DemoState {
  return {
    conn: 'idle',
    flags: null,
    seed: null,
    t0: null,
    tDone: null,
    channels: freshChannels(),
    trail: [],
    messages: [],
    lastError: null,
    receivedAt: 0,
  };
}

// ---------------------------------------------------------------------------
// Reducer actions
// ---------------------------------------------------------------------------

type Action =
  | { type: 'conn'; conn: ConnState }
  | { type: 'session'; flags: PublicFlags; seed: DemoSeed }
  | { type: 'reset' }
  | { type: 'localUserMessage'; text: string; id: string; ts: number }
  | { type: 'resolveUserMessage'; id: string }
  | { type: 'assistantMessage'; text: string; ts: number; messageType?: string | null }
  | { type: 'event'; evt: DemoEvent };

let seq = 0;
const nextId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${(seq++).toString(36)}`;

/** Order channels reach terminal "delivered" — used to detect the final confirmation. */
function allDelivered(channels: Record<StatusChannel, ChannelStatus>): boolean {
  return CHANNELS.every((c) => channels[c].state === 'delivered');
}

function pushTrail(trail: TrailStep[], step: TrailStep): TrailStep[] {
  // Cap the trail so a long-running demo never grows unbounded on stage.
  const next = [...trail, step];
  return next.length > 60 ? next.slice(next.length - 60) : next;
}

function reducer(state: DemoState, action: Action): DemoState {
  switch (action.type) {
    case 'conn':
      return { ...state, conn: action.conn };

    case 'session':
      return {
        ...initialState(),
        conn: state.conn,
        flags: action.flags,
        seed: action.seed,
      };

    case 'reset':
      return { ...initialState(), conn: state.conn, flags: state.flags, seed: state.seed };

    case 'localUserMessage': {
      const msg: ChatMessage = {
        id: action.id,
        role: 'user',
        text: action.text,
        ts: action.ts,
        pending: true,
      };
      return {
        ...state,
        // Arm the wow-metric clock on the FIRST user message.
        t0: state.t0 ?? action.ts,
        messages: [...state.messages, msg],
        trail: pushTrail(state.trail, {
          id: nextId('tr'),
          kind: 'milestone',
          text: 'Customer message received',
          ts: action.ts,
        }),
      };
    }

    case 'resolveUserMessage':
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.id ? { ...m, pending: false } : m,
        ),
      };

    case 'assistantMessage': {
      const msg: ChatMessage = {
        id: nextId('asst'),
        role: 'assistant',
        text: action.text,
        ts: action.ts,
        messageType: action.messageType ?? null,
      };
      return { ...state, messages: [...state.messages, msg] };
    }

    case 'event':
      return reduceEvent(state, action.evt);

    default:
      return state;
  }
}

function reduceEvent(state: DemoState, evt: DemoEvent): DemoState {
  const stamp = { ...state, receivedAt: Date.now() };
  const type = evt.type as EventName;

  switch (type) {
    case EVENT.HEARTBEAT:
      // Heartbeats only prove liveness; nothing to fold.
      return { ...stamp, conn: state.conn === 'live' ? 'live' : 'live' };

    case EVENT.AGENT_REASONING: {
      const p = evt.payload as AgentReasoningPayload;
      // If the reasoning carried a transcript assistant message, mirror it into chat.
      let messages = state.messages;
      if (p.message && p.message.role === 'assistant' && p.message.text) {
        messages = [
          ...messages,
          {
            id: nextId('asst'),
            role: 'assistant',
            text: p.message.text,
            ts: p.message.ts ?? evt.ts,
            messageType: p.message.messageType ?? null,
          },
        ];
      }
      return {
        ...stamp,
        messages,
        trail: pushTrail(state.trail, {
          id: nextId('tr'),
          kind: 'reasoning',
          text: p.text,
          ts: evt.ts,
        }),
      };
    }

    case EVENT.TOOL_CALLED: {
      const p = evt.payload as ToolCalledPayload;
      return {
        ...stamp,
        trail: pushTrail(state.trail, {
          id: nextId('tr'),
          kind: 'tool',
          tool: p.tool,
          text: humanizeTool(p.tool, p.args),
          ts: evt.ts,
        }),
      };
    }

    case EVENT.REFUND_ISSUED:
    case EVENT.REFUND_CONFIRMED: {
      const p = evt.payload as RefundConfirmedPayload;
      const channels = {
        ...state.channels,
        refund: {
          channel: 'refund' as const,
          state: 'delivered' as StatusState,
          mode: p.mode,
          detail: `${formatMoney(p.amount, p.currency)} → order #${p.orderId}`,
          ts: evt.ts,
        },
      };
      return {
        ...stamp,
        channels,
        tDone: allDelivered(channels) ? evt.ts : state.tDone,
        trail: pushTrail(state.trail, {
          id: nextId('tr'),
          kind: 'milestone',
          text: `Refund ${type === EVENT.REFUND_CONFIRMED ? 'confirmed' : 'issued'} — ${formatMoney(p.amount, p.currency)}`,
          ts: evt.ts,
        }),
      };
    }

    case EVENT.EMAIL_SENT: {
      const p = evt.payload as EmailSentPayload;
      const channels = {
        ...state.channels,
        email: {
          channel: 'email' as const,
          state: 'delivered' as StatusState,
          mode: p.mode,
          detail: `to ${p.to}`,
          ts: evt.ts,
        },
      };
      return {
        ...stamp,
        channels,
        tDone: allDelivered(channels) ? evt.ts : state.tDone,
      };
    }

    case EVENT.WHATSAPP_SENT: {
      const p = evt.payload as WhatsAppSentPayload;
      const channels = {
        ...state.channels,
        whatsapp: {
          channel: 'whatsapp' as const,
          state: 'delivered' as StatusState,
          mode: p.mode,
          detail: `to ${p.to}`,
          ts: evt.ts,
        },
      };
      return {
        ...stamp,
        channels,
        tDone: allDelivered(channels) ? evt.ts : state.tDone,
      };
    }

    case EVENT.STATUS: {
      const p = evt.payload as StatusEvent;
      const prev = state.channels[p.channel];
      const channels = {
        ...state.channels,
        [p.channel]: {
          channel: p.channel,
          state: p.state,
          mode: p.mode,
          detail: p.detail || prev?.detail,
          ts: p.ts ?? evt.ts,
        },
      } as Record<StatusChannel, ChannelStatus>;
      return {
        ...stamp,
        channels,
        tDone: allDelivered(channels) ? (state.tDone ?? evt.ts) : state.tDone,
        lastError: p.state === 'failed' ? `${p.channel}: ${p.detail}` : state.lastError,
      };
    }

    case EVENT.ERROR: {
      const p = evt.payload as ErrorPayload;
      return { ...stamp, lastError: p.message };
    }

    default:
      return stamp;
  }
}

// ---------------------------------------------------------------------------
// Formatting helpers (kept here so panels stay presentational)
// ---------------------------------------------------------------------------

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    const sym = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : '';
    return `${sym}${amount.toFixed(2)}`;
  }
}

function humanizeTool(tool: string, args?: Record<string, unknown>): string {
  const map: Record<string, string> = {
    lookup_order: 'Looking up the order',
    check_policy: 'Checking the refund policy',
    verify_identity: 'Verifying the customer',
    issue_refund: 'Issuing the refund',
    send_email: 'Sending the email confirmation',
    send_whatsapp: 'Sending the WhatsApp confirmation',
  };
  const base = map[tool] ?? tool.replace(/_/g, ' ');
  const orderId = args?.orderId ?? args?.order_id;
  return orderId ? `${base} · #${orderId}` : base;
}

// ---------------------------------------------------------------------------
// The hook
// ---------------------------------------------------------------------------

export interface UseEventStream {
  state: DemoState;
  /** POST /api/session/start → arms the dashboard. Safe to call repeatedly. */
  startSession: () => Promise<void>;
  /** POST /api/message {text} → arms t0 on first call, optimistic echo. */
  sendMessage: (text: string) => Promise<void>;
  /** POST /api/admin/reset → clears server + local state. */
  resetDemo: () => Promise<void>;
  /** Convenience: elapsed ms (live) used by the WowMetric ticker. */
  elapsedMs: number | null;
}

export function useEventStream(): UseEventStream {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef<number>(0);

  // ---- SSE connection (auto-reconnect) ------------------------------------
  useEffect(() => {
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      dispatch({ type: 'conn', conn: retryRef.current === 0 ? 'connecting' : 'reconnecting' });

      const es = new EventSource('/api/events');
      esRef.current = es;

      // Every frozen event name is registered as a named SSE listener so the
      // server's `event:` field routes correctly; we re-stamp `type` for the
      // reducer because EventSource strips it from the addEventListener path.
      const names = Object.values(EVENT) as EventName[];
      const handle = (name: EventName) => (e: MessageEvent) => {
        if (cancelled) return;
        try {
          const parsed = JSON.parse(e.data) as DemoEvent;
          dispatch({ type: 'event', evt: { ...parsed, type: parsed.type ?? name } });
        } catch {
          /* ignore malformed frame; never crash the dashboard */
        }
      };
      names.forEach((name) => es.addEventListener(name, handle(name) as EventListener));

      // Fallback for unnamed `message` frames (defensive).
      es.onmessage = (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data) as DemoEvent;
          if (parsed?.type) dispatch({ type: 'event', evt: parsed });
        } catch {
          /* ignore */
        }
      };

      es.onopen = () => {
        retryRef.current = 0;
        if (!cancelled) dispatch({ type: 'conn', conn: 'live' });
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
        if (cancelled) return;
        dispatch({ type: 'conn', conn: 'reconnecting' });
        retryRef.current += 1;
        const delay = Math.min(1000 * 2 ** Math.min(retryRef.current, 4), 8000);
        window.setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      cancelled = true;
      esRef.current?.close();
      esRef.current = null;
    };
  }, []);

  // ---- Commands -----------------------------------------------------------
  const startSession = useCallback(async () => {
    try {
      const res = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (!res.ok) throw new Error(`session/start ${res.status}`);
      const data = await res.json();
      // Tolerate either { seed, flags } or a bare seed (contract is still
      // settling with Agent B); fall back to local seed import upstream.
      if (data?.flags && data?.seed) {
        dispatch({ type: 'session', flags: data.flags, seed: data.seed });
      }
    } catch (err) {
      // Non-fatal: dashboard still runs against the imported seed.
      // eslint-disable-next-line no-console
      console.warn('startSession failed (non-fatal):', err);
    }
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const id = nextId('user');
    const ts = Date.now();
    dispatch({ type: 'localUserMessage', text: trimmed, id, ts });

    try {
      const res = await fetch('/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      });
      dispatch({ type: 'resolveUserMessage', id });
      if (!res.ok) throw new Error(`message ${res.status}`);

      // The assistant reply may arrive either as the POST body (synchronous
      // webchat) OR over SSE as an agent.reasoning event. Handle the sync body
      // path here; the SSE path is handled by the reducer.
      const data = await res.json().catch(() => null);
      const reply =
        data?.reply ??
        data?.text ??
        data?.message?.text ??
        (typeof data?.assistant === 'string' ? data.assistant : undefined);
      if (reply) {
        dispatch({
          type: 'assistantMessage',
          text: reply,
          ts: Date.now(),
          messageType: data?.message?.messageType ?? null,
        });
      }
    } catch (err) {
      dispatch({ type: 'resolveUserMessage', id });
      // eslint-disable-next-line no-console
      console.warn('sendMessage failed (non-fatal):', err);
    }
  }, []);

  const resetDemo = useCallback(async () => {
    try {
      await fetch('/api/admin/reset', { method: 'POST', body: '{}' });
    } catch {
      /* ignore */
    }
    dispatch({ type: 'reset' });
  }, []);

  const elapsedMs = useMemo(() => {
    if (state.t0 == null) return null;
    if (state.tDone != null) return state.tDone - state.t0;
    return null; // live ticking is done in the WowMetric component for smoothness
  }, [state.t0, state.tDone]);

  return { state, startSession, sendMessage, resetDemo, elapsedMs };
}
