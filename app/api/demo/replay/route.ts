/**
 * app/api/demo/replay/route.ts — DETERMINISTIC REPLAY TRIGGER (demo-engineer owns)
 * --------------------------------------------------------------------------------
 * POST /api/demo/replay  → fires the canned golden-path event sequence onto the
 * in-process bus (see server/replay.ts). The SSE hub streams it to the dashboard
 * exactly as if it were a live run — no BimpeAI/Stripe/Gmail/WhatsApp call, no
 * network. This is the on-stage software fallback.
 *
 * GATED: only runs when DEMO_MODE=replay. Returns 409 otherwise, so this route
 * can never light up the dashboard during a real live run.
 *
 * This lives under app/api/demo/* — a NEW namespace that does not touch the
 * routes owned by Agent B (session/start, events, bimpe/webhook, admin/reset,
 * health). It depends only on the frozen contract + server/replay.ts.
 *
 * GET /api/demo/replay  → cheap status probe ({ armed }), handy for a pre-demo
 * dry-run check that the fallback is wired without firing it.
 */

import { config } from '@server/config';
import { runReplay } from '@server/replay';

// Must run on the Node runtime (in-process bus) and never be cached.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  return Response.json({ armed: config.demoMode === 'replay', demoMode: config.demoMode });
}

export async function POST(): Promise<Response> {
  if (config.demoMode !== 'replay') {
    return Response.json(
      {
        ok: false,
        error: 'Replay is not armed. Set DEMO_MODE=replay and restart to enable the on-stage fallback.',
      },
      { status: 409 },
    );
  }

  // Fire-and-forget on the bus; resolve once the front half + orchestrator
  // hand-off have run so the caller gets the demoId/refundId for logging.
  const result = await runReplay();
  return Response.json(result, { status: result.ok ? 200 : 409 });
}
