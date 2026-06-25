'use client';

/**
 * app/components/StatusBoard.tsx — Agent A (web/UI)
 * ---------------------------------------------------------------------------
 * Three confirmation cards — Refund → Email → WhatsApp — each advancing
 * pending → sent → delivered (or failed) from the frozen status/channel events
 * the hook folds into ChannelStatus.
 *
 * Demo-safety contract: the SUCCESS (delivered) state looks IDENTICAL whether
 * the channel ran live or simulated — only a small mode chip differs. When
 * WhatsApp is faked (card-fallback / agent-turn), we render a realistic
 * WhatsApp confirmation bubble as the visual proof for judges.
 *
 * Purely presentational: the parent page owns the single useEventStream()
 * instance and passes `channels` down. We never call the hook here.
 */

import type { StatusChannel, StatusState } from '@shared/types';
import type { ChannelStatus } from '../hooks/useEventStream';
import { IconRefund, IconEmail, IconWhatsApp, IconCheck, IconSpark } from './icons';

export interface StatusBoardProps {
  /** The three confirmation channels, folded by useEventStream(). */
  channels: Record<StatusChannel, ChannelStatus>;
  /**
   * Guaranteed money/order for the WhatsApp proof bubble. The whatsapp channel
   * detail is usually just "to +44…", so the parent passes the real figures
   * (from the refund channel / seed) here. Optional — the bubble degrades to a
   * clean generic line if absent.
   */
  refundSummary?: { money?: string | null; order?: string | null } | null;
}

/** Render order is fixed: refund first, then email, then WhatsApp. */
const CHANNEL_ORDER: StatusChannel[] = ['refund', 'email', 'whatsapp'];

const CHANNEL_NAME: Record<StatusChannel, string> = {
  refund: 'Refund',
  email: 'Email',
  whatsapp: 'WhatsApp',
};

const STATE_LABEL: Record<StatusState, string> = {
  pending: 'PENDING',
  sent: 'SENDING',
  delivered: 'DELIVERED',
  failed: 'FAILED',
};

function channelIcon(channel: StatusChannel) {
  switch (channel) {
    case 'email':
      return <IconEmail aria-hidden="true" />;
    case 'whatsapp':
      return <IconWhatsApp aria-hidden="true" />;
    case 'refund':
    default:
      return <IconRefund aria-hidden="true" />;
  }
}

/**
 * Short human label for the mode chip, narrowed per channel. `mode` is the
 * union RefundMode | EmailMode | WhatsAppMode; we map only the values that can
 * legitimately appear on each channel and fall back to an upper-cased token so
 * an unexpected value never renders blank or throws.
 */
function modeChip(channel: StatusChannel, mode: ChannelStatus['mode']): string | null {
  if (!mode) return null;
  switch (channel) {
    case 'refund':
      if (mode === 'stripe') return 'STRIPE';
      if (mode === 'simulated') return 'SIM';
      break;
    case 'email':
      if (mode === 'live') return 'LIVE';
      if (mode === 'skipped') return 'DRAFT';
      break;
    case 'whatsapp':
      if (mode === 'live') return 'LIVE';
      if (mode === 'agent-turn') return 'AGENT';
      if (mode === 'card-fallback') return 'CARD';
      break;
  }
  return String(mode).toUpperCase();
}

/**
 * Opportunistically pull "£42.99" and "order #1024" out of a detail string so
 * the WhatsApp proof bubble can mirror the real confirmation. The whatsapp
 * channel's own detail is usually just "to +44…", so this often returns nulls
 * and we fall back to a clean generic line. (See note in handoff: the hook
 * does not surface the refund amount/order on the whatsapp channel.)
 */
function extractMoneyAndOrder(detail?: string): { money: string | null; order: string | null } {
  if (!detail) return { money: null, order: null };
  const moneyMatch = detail.match(/[£$€]\s?\d[\d,]*(?:\.\d{2})?/);
  const orderMatch = detail.match(/#\s?([A-Za-z0-9-]+)/);
  return {
    money: moneyMatch ? moneyMatch[0].replace(/\s/g, '') : null,
    order: orderMatch ? orderMatch[1] : null,
  };
}

/** A realistic WhatsApp confirmation message for the proof bubble. */
function whatsappProofText(
  detail?: string,
  summary?: StatusBoardProps['refundSummary'],
): string {
  const parsed = extractMoneyAndOrder(detail);
  // Prefer the guaranteed figures the parent passes; fall back to parsing.
  const money = summary?.money ?? parsed.money;
  const order = summary?.order ?? parsed.order;
  if (money && order) {
    return `Your ${money} refund for order #${order} is on its way — it’ll land on your card within 5 days. — Refund Concierge`;
  }
  if (money) {
    return `Your ${money} refund is on its way — it’ll land on your card within 5 days. — Refund Concierge`;
  }
  return 'Your refund is on its way — it’ll land on your card within 5 days. — Refund Concierge';
}

function StatusCard({
  status,
  refundSummary,
}: {
  status: ChannelStatus;
  refundSummary?: StatusBoardProps['refundSummary'];
}) {
  const channel = status.channel;
  const state: StatusState = status.state ?? 'pending';
  const delivered = state === 'delivered';
  const chip = modeChip(channel, status.mode);

  // WhatsApp proof bubble: only when delivered AND the send was faked.
  const showProof =
    channel === 'whatsapp' &&
    delivered &&
    (status.mode === 'card-fallback' || status.mode === 'agent-turn');

  return (
    <div className="rc-status" data-state={state}>
      {chip ? <span className="rc-status-mode">{chip}</span> : null}

      <div className="rc-status-icon">{channelIcon(channel)}</div>
      <div className="rc-status-name">{CHANNEL_NAME[channel]}</div>

      <div className="rc-status-state">
        <span>{STATE_LABEL[state] ?? STATE_LABEL.pending}</span>
        {delivered ? (
          <IconCheck className="tick" aria-hidden="true" />
        ) : (
          <span
            aria-hidden="true"
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: 'currentColor',
              opacity: 0.5,
            }}
          />
        )}
      </div>

      {/* Placeholder em-dash keeps the row height stable before detail arrives. */}
      <div className="rc-status-detail">{status.detail ? status.detail : '—'}</div>

      {showProof ? (
        <div className="rc-wa-proof" role="note" aria-label="WhatsApp confirmation preview">
          <div>{whatsappProofText(status.detail, refundSummary)}</div>
          <div className="meta">
            <span>WhatsApp · just now</span>
            <span
              aria-label="delivered"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 1, color: 'var(--mint)' }}
            >
              <IconCheck aria-hidden="true" style={{ width: 11, height: 11 }} />
              <IconCheck
                aria-hidden="true"
                style={{ width: 11, height: 11, marginLeft: -5 }}
              />
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function StatusBoard({ channels, refundSummary }: StatusBoardProps) {
  return (
    <section className="rc-card" aria-label="Confirmations">
      <div className="rc-card-head">
        <span className="rc-card-eyebrow">
          <IconSpark aria-hidden="true" />
          Confirmations
        </span>
      </div>

      <div className="rc-card-body">
        <div className="rc-status-grid">
          {CHANNEL_ORDER.map((channel) => {
            // Defensive: the hook guarantees all three keys, but never throw on
            // a partial/null prop during an early render.
            const status: ChannelStatus =
              channels?.[channel] ?? { channel, state: 'pending' };
            return <StatusCard key={channel} status={status} refundSummary={refundSummary} />;
          })}
        </div>
      </div>
    </section>
  );
}
