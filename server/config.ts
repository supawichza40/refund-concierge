/**
 * server/config.ts — FROZEN CONTRACT (feature flags + mode auto-detection)
 * ------------------------------------------------------------------------
 * Owner: foundation (Agent B reads it; do not change shape without agreement).
 *
 * SERVER-ONLY. This module reads secrets (BIMPEAI_API_KEY, Stripe key) from
 * process.env. It MUST NOT be imported into any client component. The browser
 * gets only the sanitized PublicFlags via SessionStartResponse / /api/health.
 *
 * Every flag auto-detects a safe default from env, and every flag can be
 * force-overridden by an explicit env var (so a demo operator can pin a mode).
 * The fallback for every external dependency is a config flag, never a rewrite.
 */

import type { PublicFlags, RefundMode } from '@shared/types';

// ---------------------------------------------------------------------------
// Resolved, typed config
// ---------------------------------------------------------------------------

export interface AppConfig {
  // --- Secrets (server-only, never logged, never sent to the client) ---------
  /** BimpeAI API key — present iff the live webchat path is usable. */
  readonly bimpeApiKey: string | undefined;
  /** Optional webhook signing secret to authenticate inbound BimpeAI POSTs. */
  readonly bimpeWebhookSecret: string | undefined;
  /** Stripe secret key — present iff a real test refund can be issued. */
  readonly stripeSecretKey: string | undefined;

  // --- BimpeAI live-path config ----------------------------------------------
  readonly bimpeBaseUrl: string;
  /** Pre-created agent id to talk to (optional; BFF may create one at boot). */
  readonly bimpeAgentId: string | undefined;

  // --- Demo customer overrides (fall back to seed.json) ----------------------
  readonly demoCustomerEmail: string | undefined;
  readonly demoCustomerWhatsApp: string | undefined;

  // --- Feature flags (the demo-safety contract) ------------------------------
  /** 'stripe' if STRIPE_SECRET_KEY present (or forced), else 'simulated'. */
  readonly stripeMode: RefundMode;
  /** Whether to attempt a real Gmail send. */
  readonly emailLive: boolean;
  /**
   * WhatsApp delivery strategy:
   *  - 'live'      : real outbound WhatsApp send (flag-gated upgrade; dashboard-only connect today)
   *  - 'agent-turn': deliver as a turn inside the BimpeAI webchat conversation
   *  - 'card-stub' : render a WhatsApp-style card on the dashboard (default, cannot-crash)
   */
  readonly whatsappMode: 'live' | 'agent-turn' | 'card-stub';
  /** Web Voice widget — dashboard-only to actually enable; off by default. */
  readonly voiceEnabled: boolean;
  /** Show the "Play recorded run" fallback-video button. */
  readonly fallbackVideo: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function envStr(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== '' ? v.trim() : undefined;
}

function envBool(name: string): boolean | undefined {
  const v = envStr(name)?.toLowerCase();
  if (v === undefined) return undefined;
  if (v === 'true' || v === '1' || v === 'yes' || v === 'on') return true;
  if (v === 'false' || v === '0' || v === 'no' || v === 'off') return false;
  return undefined;
}

/**
 * Normalize the WHATSAPP_MODE env (which the .env example documents as
 * `api|agent-turn`) into the frozen contract union. `api` -> `live`.
 */
function resolveWhatsAppMode(): AppConfig['whatsappMode'] {
  const raw = envStr('WHATSAPP_MODE')?.toLowerCase();
  switch (raw) {
    case 'live':
    case 'api':
      return 'live';
    case 'agent-turn':
      return 'agent-turn';
    case 'card-stub':
    case 'card-fallback':
      return 'card-stub';
    default:
      // Default to the cannot-crash card stub unless explicitly upgraded.
      return 'card-stub';
  }
}

function resolveStripeMode(): RefundMode {
  const forced = envStr('STRIPE_MODE')?.toLowerCase();
  if (forced === 'stripe') return 'stripe';
  if (forced === 'simulated') return 'simulated';
  // Auto-detect: real Stripe only if a secret key is present.
  return envStr('STRIPE_SECRET_KEY') ? 'stripe' : 'simulated';
}

// ---------------------------------------------------------------------------
// Build (memoized) — read env once at module load.
// ---------------------------------------------------------------------------

function buildConfig(): AppConfig {
  const stripeSecretKey = envStr('STRIPE_SECRET_KEY');

  return {
    bimpeApiKey: envStr('BIMPEAI_API_KEY'),
    bimpeWebhookSecret: envStr('BIMPE_WEBHOOK_SECRET'),
    stripeSecretKey,

    bimpeBaseUrl: envStr('BIMPEAI_BASE_URL') ?? 'https://api.bimpe.ai/api/v1',
    bimpeAgentId: envStr('BIMPEAI_AGENT_ID'),

    demoCustomerEmail: envStr('DEMO_CUSTOMER_EMAIL'),
    demoCustomerWhatsApp: envStr('DEMO_CUSTOMER_WHATSAPP'),

    stripeMode: resolveStripeMode(),
    // Email defaults to live (real Gmail send) unless explicitly disabled.
    emailLive: envBool('EMAIL_LIVE') ?? true,
    whatsappMode: resolveWhatsAppMode(),
    voiceEnabled: envBool('VOICE_ENABLED') ?? false,
    fallbackVideo: envBool('FALLBACK_VIDEO') ?? false,
  };
}

export const config: AppConfig = buildConfig();

/** True iff the live BimpeAI webchat path is usable (else stubbed canned reply). */
export const hasBimpeKey: boolean = config.bimpeApiKey !== undefined;

/**
 * Sanitized flags safe to send to the browser. NO secret values cross this line.
 * Used by /api/session/start and /api/health.
 */
export function publicFlags(): PublicFlags {
  return {
    stripeMode: config.stripeMode,
    emailLive: config.emailLive,
    whatsappMode: config.whatsappMode === 'card-stub' ? 'card-stub' : config.whatsappMode,
    voiceEnabled: config.voiceEnabled,
    fallbackVideo: config.fallbackVideo,
  };
}
