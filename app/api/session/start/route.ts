/**
 * app/api/session/start/route.ts — mint a demo session (Agent B owns)
 * ------------------------------------------------------------------
 * POST /api/session/start  ->  SessionStartResponse
 *
 * Resets demo state from seed.json, mints a short-lived session token + a
 * stable channel_user_id (uuid), and returns the public (secret-free) flags so
 * the dashboard can render its "demo mode" badge. NEVER returns the API key.
 */

import { NextResponse } from 'next/server';

import { bus } from '@server/bff/bus';
import { startSession } from '@server/bff/state';
import { publicFlags } from '@server/config';
import { EVENT, makeEvent } from '@shared/events';
import type { SessionStartResponse } from '@shared/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(): Promise<NextResponse> {
  const session = startSession();

  // Seed the reasoning trail with an opening turn so the dashboard isn't empty.
  bus.publish(
    makeEvent(
      EVENT.AGENT_REASONING,
      { text: `Demo session started for ${session.seed.customer.name}, order #${session.seed.order.id}.` },
      session.demoId,
    ),
  );

  const body: SessionStartResponse = {
    sessionToken: session.sessionToken,
    seed: session.seed,
    flags: publicFlags(),
  };
  return NextResponse.json(body);
}
