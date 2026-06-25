/**
 * server/bff/state.ts — in-process demo session state (Agent B owns)
 * ------------------------------------------------------------------
 * SERVER-ONLY, in-memory, single-process. Holds the live demo session: the
 * minted session token + channel_user_id, the BimpeAI conversation id, the
 * seed snapshot the demo is running against, and the refund record once issued.
 *
 * Stashed on globalThis (same pattern as server/bff/bus.ts) so Next.js dev
 * hot-reload and multiple route module instances all share ONE state object —
 * otherwise /api/message and /api/refund could land on different copies.
 *
 * State is intentionally trivial: this is a single-operator demo, not a
 * multi-tenant server. /api/session/start and /api/admin/reset both reset it.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

import { config } from '@server/config';
import type { Customer, DemoSeed, Order, RefundMode } from '@shared/types';

/** A refund record as tracked by the demo (one per session, at most). */
export interface RefundRecord {
  refundId: string;
  orderId: string;
  amount: number;
  currency: string;
  mode: RefundMode;
  issuedAt: number;
}

/** The mutable per-session demo state. */
export interface DemoSession {
  /** demoId used as the SSE correlation id for this run. */
  demoId: string;
  /** Short-lived session token handed to the browser (NEVER the API key). */
  sessionToken: string;
  /** Stable channel_user_id (uuid) used for all BimpeAI webchat turns. */
  channelUserId: string;
  /** BimpeAI conversation id, set after the first sendMessage. */
  conversationId?: string;
  /** The seed snapshot this session is running against. */
  seed: DemoSeed;
  /** The refund once issued (idempotency guard + health/reset visibility). */
  refund?: RefundRecord;
  /** Epoch ms the session was started. */
  startedAt: number;
}

// ---------------------------------------------------------------------------
// Seed loading (seed.json + config overrides for the deliverable channels)
// ---------------------------------------------------------------------------

interface RawSeed {
  customer: Customer;
  order: Order;
  refundPolicy: string;
}

function loadSeed(): DemoSeed {
  // seed.json lives at the repo root.
  const raw = JSON.parse(
    readFileSync(join(process.cwd(), 'seed.json'), 'utf8'),
  ) as RawSeed;

  // Config can override the real delivery targets (email/whatsapp) so the
  // confirmations land in a controllable inbox/number during the demo.
  const customer: Customer = {
    ...raw.customer,
    email: config.demoCustomerEmail ?? raw.customer.email,
    whatsapp: config.demoCustomerWhatsApp ?? raw.customer.whatsapp,
  };

  return { customer, order: raw.order, refundPolicy: raw.refundPolicy };
}

// ---------------------------------------------------------------------------
// Singleton store on globalThis
// ---------------------------------------------------------------------------

const GLOBAL_KEY = '__refundConciergeState__';

interface Store {
  session: DemoSession | null;
}

function getStore(): Store {
  const g = globalThis as Record<string, unknown>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = { session: null } as Store;
  }
  return g[GLOBAL_KEY] as Store;
}

/** Start (or restart) a demo session. Returns the fresh session. */
export function startSession(): DemoSession {
  const store = getStore();
  const session: DemoSession = {
    demoId: randomUUID(),
    sessionToken: `sess_${randomUUID()}`,
    channelUserId: randomUUID(),
    seed: loadSeed(),
    startedAt: Date.now(),
  };
  store.session = session;
  return session;
}

/** The current session, or null if none has been started. */
export function getSession(): DemoSession | null {
  return getStore().session;
}

/**
 * The current session, lazily started if none exists. /api/message and
 * /api/refund call this so the demo still works if the operator forgot to hit
 * "Start demo" first (cannot-crash default).
 */
export function ensureSession(): DemoSession {
  return getStore().session ?? startSession();
}

/** Record the BimpeAI conversation id on the current session (first turn). */
export function setConversationId(conversationId: string): void {
  const s = getStore().session;
  if (s && !s.conversationId) s.conversationId = conversationId;
}

/** Record the refund on the current session. Returns the record. */
export function setRefund(record: RefundRecord): RefundRecord {
  const s = ensureSession();
  s.refund = record;
  return record;
}

/** Reset all demo state (POST /api/admin/reset). */
export function resetState(): void {
  getStore().session = null;
}
