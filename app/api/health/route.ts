/**
 * app/api/health/route.ts — health + resolved flags (Agent B owns)
 * ------------------------------------------------------------------
 * GET /api/health  ->  { ok, flags, bus, session, agentConfigured }
 *
 * Returns the secret-free public flags plus light diagnostics (bus subscriber
 * count, whether a session/refund exists, whether our demo agent id is wired).
 * NEVER returns any secret value.
 */

import { NextResponse } from 'next/server';

import { resolveAgentId } from '@server/bff/bimpe';
import { bus } from '@server/bff/bus';
import { getSession } from '@server/bff/state';
import { hasBimpeKey, publicFlags } from '@server/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const session = getSession();
  return NextResponse.json({
    ok: true,
    flags: publicFlags(),
    bus: { subscribers: bus.size },
    agentConfigured: Boolean(resolveAgentId()),
    bimpeLive: hasBimpeKey,
    session: session
      ? {
          demoId: session.demoId,
          hasConversation: Boolean(session.conversationId),
          refunded: Boolean(session.refund),
        }
      : null,
  });
}
