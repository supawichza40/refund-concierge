/**
 * shared/events.ts — FROZEN CONTRACT (event names + payload shapes + SSE envelope)
 * --------------------------------------------------------------------------------
 * Owner: foundation (do not edit without all of A/B/C agreeing).
 *
 * This file defines:
 *   1. The event TYPE NAMES that flow over the in-process bus and out via SSE.
 *   2. The PAYLOAD shape for each event.
 *   3. The SSE ENVELOPE the dashboard subscribes to.
 *
 * The bus IMPLEMENTATION lives in server/bff/bus.ts (Agent B). This file is
 * pure types + constants so it can be imported by both client (A) and server
 * (B, C) with zero runtime/Node dependencies.
 */

import type {
  RefundMode,
  EmailMode,
  WhatsAppMode,
  StatusEvent,
  ConversationMessage,
} from './types';

// ---------------------------------------------------------------------------
// Event names (the SSE `event:` field and the bus channel keys)
// ---------------------------------------------------------------------------

export const EVENT = {
  /** A reasoning/explanation turn surfaced from the transcript or our own trail. */
  AGENT_REASONING: 'agent.reasoning',
  /** A tool/action decision we inferred or our orchestrator performed. */
  TOOL_CALLED: 'tool.called',
  /** The refund was issued (Stripe or simulated). Triggers the orchestrator. */
  REFUND_ISSUED: 'refund.issued',
  /** The refund was caught + validated by the BFF; dashboard turns the card green. */
  REFUND_CONFIRMED: 'refund.confirmed',
  /** Email confirmation result. */
  EMAIL_SENT: 'email.sent',
  /** WhatsApp confirmation result. */
  WHATSAPP_SENT: 'whatsapp.sent',
  /** Per-channel lifecycle update (pending/sent/delivered/failed). */
  STATUS: 'status',
  /** Any non-fatal failure on a channel; dashboard shows a red card, demo continues. */
  ERROR: 'error',
  /** Keep-alive every 15s so the dashboard never shows a dead connection. */
  HEARTBEAT: 'heartbeat',
} as const;

export type EventName = (typeof EVENT)[keyof typeof EVENT];

// ---------------------------------------------------------------------------
// Per-event payload shapes
// ---------------------------------------------------------------------------

export interface AgentReasoningPayload {
  refundId?: string;
  /** What the agent is doing / thinking, in plain language. */
  text: string;
  /** The originating transcript message, when this was derived from one. */
  message?: ConversationMessage;
}

export interface ToolCalledPayload {
  refundId?: string;
  /** e.g. "lookup_order", "issue_refund". */
  tool: string;
  /** Best-effort args we know about (may be partial). */
  args?: Record<string, unknown>;
}

export interface RefundIssuedPayload {
  refundId: string;
  orderId: string;
  /** MAJOR currency units. */
  amount: number;
  currency: string;
  mode: RefundMode;
}

export interface RefundConfirmedPayload {
  refundId: string;
  orderId: string;
  /** MAJOR currency units. */
  amount: number;
  currency: string;
  mode: RefundMode;
}

export interface EmailSentPayload {
  refundId: string;
  to: string;
  /** Provider message id when live; undefined when skipped. */
  messageId?: string;
  mode: EmailMode;
}

export interface WhatsAppSentPayload {
  refundId: string;
  to: string;
  mode: WhatsAppMode;
}

export interface ErrorPayload {
  /** Which channel failed, when applicable. */
  channel?: StatusEvent['channel'];
  refundId?: string;
  message: string;
}

// StatusEvent is the payload for EVENT.STATUS (re-exported for convenience).
export type { StatusEvent } from './types';

/** Maps each event name to its payload type. */
export interface EventPayloadMap {
  [EVENT.AGENT_REASONING]: AgentReasoningPayload;
  [EVENT.TOOL_CALLED]: ToolCalledPayload;
  [EVENT.REFUND_ISSUED]: RefundIssuedPayload;
  [EVENT.REFUND_CONFIRMED]: RefundConfirmedPayload;
  [EVENT.EMAIL_SENT]: EmailSentPayload;
  [EVENT.WHATSAPP_SENT]: WhatsAppSentPayload;
  [EVENT.STATUS]: StatusEvent;
  [EVENT.ERROR]: ErrorPayload;
  [EVENT.HEARTBEAT]: { ts: number };
}

// ---------------------------------------------------------------------------
// SSE envelope — the exact shape written to the wire and parsed by the client.
//
//   event: <type>
//   data:  <JSON of DemoEvent>
//
// Agent A parses `data` as DemoEvent<EventName>. Agents B + C construct these
// via makeEvent() and publish them on the bus.
// ---------------------------------------------------------------------------

export interface DemoEvent<T extends EventName = EventName> {
  type: T;
  /** Epoch ms. */
  ts: number;
  payload: EventPayloadMap[T];
  /** Correlates all events for one demo run (the session/demo id). */
  demoId: string;
}

/** Construct a well-formed envelope. Use this everywhere; never hand-roll. */
export function makeEvent<T extends EventName>(
  type: T,
  payload: EventPayloadMap[T],
  demoId: string,
  ts: number = Date.now(),
): DemoEvent<T> {
  return { type, ts, payload, demoId };
}

/** Serialize one envelope into an SSE frame (`event:`/`data:` + blank line). */
export function toSseFrame(evt: DemoEvent): string {
  return `event: ${evt.type}\ndata: ${JSON.stringify(evt)}\n\n`;
}

/** Heartbeat interval contract — the SSE hub MUST emit at this cadence. */
export const HEARTBEAT_MS = 15_000;

/**
 * The in-process bus CONTRACT. The concrete singleton is implemented in
 * server/bff/bus.ts (Agent B); orchestrator (C) and SSE route (B) both use it.
 * Defined here so the shape is frozen and shared.
 */
export interface DemoEventBus {
  /** Publish an envelope to all current subscribers. */
  publish(evt: DemoEvent): void;
  /** Subscribe; returns an unsubscribe function. */
  subscribe(listener: (evt: DemoEvent) => void): () => void;
}
