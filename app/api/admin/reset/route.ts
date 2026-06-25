/**
 * app/api/admin/reset/route.ts — reset demo state (Agent B owns)
 * ------------------------------------------------------------------
 * POST /api/admin/reset  ->  { ok: true }
 *
 * Clears the in-process demo session (session token, conversation id, refund
 * record) so the operator can re-run the golden path from a clean slate. Emits
 * a reasoning trail note on a fresh demoId so any connected dashboards see it.
 */

import { NextResponse } from 'next/server';

import { bus } from '@server/bff/bus';
import { resetState } from '@server/bff/state';
import { EVENT, makeEvent } from '@shared/events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(): Promise<NextResponse> {
  resetState();
  bus.publish(makeEvent(EVENT.AGENT_REASONING, { text: 'Demo state reset.' }, 'reset'));
  return NextResponse.json({ ok: true });
}
