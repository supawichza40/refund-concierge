/**
 * app/api/refund/route.ts — explicit refund trigger (Agent B owns)
 * ------------------------------------------------------------------
 * POST /api/refund  ->  { refundId, orderId, amount, currency, mode, alreadyIssued }
 *
 * The deterministic refund trigger the demo can call directly, so the golden
 * path does NOT depend on the agent's exact wording. Executes the refund in OUR
 * app (simulated re_sim_* by default, or a REAL Stripe TEST refund when
 * STRIPE_SECRET_KEY is present), emits refund.issued / refund.confirmed, and
 * invokes the Confirmation Orchestrator. Idempotent within a session.
 */

import { NextResponse } from 'next/server';

import { issueRefund } from '@server/bff/refund';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(): Promise<NextResponse> {
  try {
    const { refund, alreadyIssued } = await issueRefund();
    return NextResponse.json({ ...refund, alreadyIssued });
  } catch (err) {
    return NextResponse.json(
      { error: 'Refund failed', detail: String(err) },
      { status: 500 },
    );
  }
}
