/**
 * shared/types.ts — FROZEN CONTRACT (single source of truth)
 * ------------------------------------------------------------------
 * Owner: foundation (do not edit without all of A/B/C agreeing).
 * Agents A (web/app UI), B (server/bff), C (server/orchestrator) all import
 * from here. Nobody redefines these shapes locally.
 *
 * Built to VERIFIED platform reality: the live path to the BimpeAI agent is
 * the synchronous **webchat** endpoint. There is no guaranteed tool-call /
 * trace array, so the "reasoning trail" is assembled from the transcript +
 * our own orchestrator events — NOT from an assumed BimpeAI trace API.
 */

// ---------------------------------------------------------------------------
// Mode unions — every external dependency carries a `mode` on its success
// event so the dashboard renders the SAME UI whether live or simulated.
// ---------------------------------------------------------------------------

/** How the refund itself was executed. */
export type RefundMode = 'stripe' | 'simulated';

/** How the email confirmation was delivered. */
export type EmailMode = 'live' | 'skipped';

/**
 * How the WhatsApp confirmation was delivered.
 * - 'live'          : real outbound WhatsApp send (dashboard-only connect today; flag-gated upgrade)
 * - 'agent-turn'    : delivered as a turn in the BimpeAI webchat conversation
 * - 'card-fallback' : rendered as a realistic WhatsApp-style card on the dashboard
 */
export type WhatsAppMode = 'live' | 'agent-turn' | 'card-fallback';

/** Whether the BimpeAI Web Voice widget is enabled (dashboard-only to turn on). */
export type VoiceMode = 'on' | 'off';

/** Per-channel delivery lifecycle (drives the StatusBoard cards). */
export type StatusState = 'pending' | 'sent' | 'delivered' | 'failed';

/** The fan-out channels the orchestrator drives, plus the refund itself. */
export type StatusChannel = 'refund' | 'email' | 'whatsapp';

// ---------------------------------------------------------------------------
// Core domain entities
// ---------------------------------------------------------------------------

/** The seeded demo customer (golden-path data lives in seed.json). */
export interface Customer {
  /** Stable id, e.g. "cust_ada". */
  id: string;
  name: string;
  /** Real, controllable inbox the email confirmation is delivered to. */
  email: string;
  /** E.164 number the WhatsApp confirmation is delivered to. */
  whatsapp: string;
}

/** The seeded order the customer is disputing. */
export interface Order {
  /** e.g. "1024". */
  id: string;
  item: string;
  /** Charged amount in MAJOR currency units (e.g. 42.99 means £42.99). */
  amount: number;
  /** ISO 4217 currency code, e.g. "GBP". */
  currency: string;
  /** Why a refund is owed, e.g. "charged twice / duplicate charge". */
  issue: string;
  /** Quoted refund settlement window shown to the customer. */
  etaDays: number;
}

/** A single chat turn in the BimpeAI webchat conversation. */
export interface ConversationMessage {
  /** Speaker. 'assistant' is the BimpeAI agent; 'user' is the customer. */
  role: 'user' | 'assistant' | 'system';
  /** Final text content (the webchat response is final-text-centric). */
  text: string;
  /** Epoch ms when observed. */
  ts: number;
  /**
   * BimpeAI's message_type when present — MAY BE NULL/absent. Do not rely on
   * it to drive the trail; it is captured opportunistically only.
   */
  messageType?: string | null;
}

/** A refund as tracked by the demo. */
export interface Refund {
  /** Stripe refund id (re_...) or simulated id (re_sim_<ts>). */
  id: string;
  orderId: string;
  /** MAJOR currency units, mirrors Order.amount. */
  amount: number;
  currency: string;
  mode: RefundMode;
  /** Epoch ms the refund was issued. */
  issuedAt: number;
}

/**
 * The context handed to the Confirmation Orchestrator when a refund is caught.
 * (ARCHITECTURE.md calls this RefundContext; this is the canonical shape.)
 */
export interface RefundContext {
  refundId: string;
  orderId: string;
  /** MAJOR currency units. */
  amount: number;
  currency: string;
  mode: RefundMode;
  customer: Customer;
  /** Quoted settlement window, surfaced in confirmation copy. */
  etaDays: number;
  /** Item name, surfaced in confirmation copy. */
  item: string;
}

/**
 * A status lifecycle event for one channel — the payload of the SSE `status`
 * stream events. Emitted by B (refund) and C (email/whatsapp); consumed by A.
 */
export interface StatusEvent {
  refundId: string;
  channel: StatusChannel;
  state: StatusState;
  /** The mode of whichever channel this event is for (narrow at the call site). */
  mode: RefundMode | EmailMode | WhatsAppMode;
  /** Human-readable detail, e.g. "sent to +44…" or the would-be email subject. */
  detail: string;
  /** Epoch ms. */
  ts: number;
}

// ---------------------------------------------------------------------------
// Session / API payloads (BFF endpoints — Agent B)
// ---------------------------------------------------------------------------

/** The seed snapshot the dashboard renders before/while the demo runs. */
export interface DemoSeed {
  customer: Customer;
  order: Order;
  /** Default refund policy text used to seed the BimpeAI inline KB (≤2500 chars). */
  refundPolicy: string;
}

/** Response of POST /api/session/start. */
export interface SessionStartResponse {
  /** Short-lived, server-minted token for the voice widget — NEVER the API key. */
  sessionToken: string;
  seed: DemoSeed;
  /** Resolved feature flags so the dashboard can render its "demo mode" badge. */
  flags: PublicFlags;
}

/**
 * The subset of feature flags safe to expose to the browser (no secrets).
 * Mirror of server/config.ts resolved flags, secret values stripped.
 */
export interface PublicFlags {
  stripeMode: RefundMode;
  emailLive: boolean;
  whatsappMode: 'live' | 'agent-turn' | 'card-stub';
  voiceEnabled: boolean;
  fallbackVideo: boolean;
}
