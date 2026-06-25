'use client';

/**
 * app/page.tsx — Refund Concierge dashboard (Agent A, web/UI owner)
 * ---------------------------------------------------------------------------
 * The single-screen stage dashboard. It owns the ONE useEventStream() instance
 * and threads its derived state into the four panels:
 *
 *   WowMetric       — hero resolution-time number (top, full width)
 *   TalkPanel       — text chat with the concierge agent (left)
 *   ReasoningTrail  — live animated trail of the agent's work (right, top)
 *   StatusBoard     — Refund → Email → WhatsApp confirmation cards (right)
 *
 * The browser only CONSUMES via SSE and SENDS via plain POST — all the wiring
 * lives in the hook. This file is layout + a little derived state.
 */

import { useMemo, useState } from 'react';
import seedData from '@/seed.json';
import type { DemoSeed, StatusChannel } from '@shared/types';
import { useEventStream, formatMoney } from './hooks/useEventStream';
import TalkPanel from './components/TalkPanel';
import ReasoningTrail from './components/ReasoningTrail';
import StatusBoard from './components/StatusBoard';
import WowMetric from './components/WowMetric';
import { IconLogo, IconBolt, IconAlert } from './components/icons';

const CHANNELS: StatusChannel[] = ['refund', 'email', 'whatsapp'];

/** Map the hook's ConnState to chip tone + label. */
const CONN_META: Record<string, { tone: string; label: string }> = {
  idle: { tone: 'idle', label: 'offline' },
  connecting: { tone: 'connecting', label: 'connecting' },
  reconnecting: { tone: 'reconnecting', label: 'reconnecting' },
  live: { tone: 'live', label: 'live' },
};

export default function Page() {
  const { state, startSession, sendMessage, resetDemo } = useEventStream();
  const [fallbackOpen, setFallbackOpen] = useState(false);

  // The seed: prefer the session-provided seed, fall back to the frozen import
  // so the dashboard is fully populated before /api/session/start even runs.
  const seed = (state.seed ?? (seedData as DemoSeed)) as DemoSeed;

  const allDone = useMemo(
    () => CHANNELS.every((c) => state.channels[c]?.state === 'delivered'),
    [state.channels],
  );

  // Guaranteed figures for the WhatsApp proof bubble — from the seed/refund.
  const refundSummary = useMemo(() => {
    const order = seed?.order;
    return {
      money: order ? formatMoney(order.amount, order.currency) : null,
      order: order?.id ?? null,
    };
  }, [seed]);

  const conn = CONN_META[state.conn] ?? CONN_META.idle;
  const flags = state.flags;

  return (
    <main className="rc-shell">
      <header className="rc-header">
        <div className="rc-brand">
          <span className="rc-logomark">
            <IconLogo />
          </span>
          <div>
            <div className="rc-title">Refund Concierge</div>
            <div className="rc-sub">
              Agentic refund → email + WhatsApp confirmation, live
            </div>
          </div>
        </div>

        <div className="rc-header-right">
          {/* Connection liveness */}
          <span className="rc-chip" data-tone={conn.tone}>
            <span className="dot" aria-hidden="true" />
            {conn.label}
          </span>

          {/* Resolved demo-mode chips (only once session flags load) */}
          {flags && (
            <>
              <span className="rc-chip" data-tone={flags.stripeMode === 'stripe' ? 'live' : 'sim'}>
                <span className="dot" aria-hidden="true" />
                {flags.stripeMode === 'stripe' ? 'stripe live' : 'refund sim'}
              </span>
            </>
          )}

          {flags?.fallbackVideo && (
            <button
              type="button"
              className="rc-btn"
              data-variant="ghost"
              onClick={() => setFallbackOpen(true)}
            >
              Play recorded run
            </button>
          )}

          <button type="button" className="rc-btn" data-variant="ghost" onClick={resetDemo}>
            Reset
          </button>
          <button type="button" className="rc-btn" data-variant="primary" onClick={startSession}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <IconBolt style={{ width: 15, height: 15 }} />
              Start demo
            </span>
          </button>
        </div>
      </header>

      {state.lastError && (
        <div className="rc-error-banner" role="alert">
          <IconAlert style={{ width: 15, height: 15, flex: '0 0 auto' }} />
          <span>{state.lastError}</span>
        </div>
      )}

      <div className="rc-grid">
        <div className="rc-area-metric">
          <WowMetric t0={state.t0} tDone={state.tDone} allDone={allDone} />
        </div>

        <div className="rc-area-talk">
          <TalkPanel messages={state.messages} onSend={sendMessage} seed={seed} />
        </div>

        <div className="rc-area-right">
          <ReasoningTrail steps={state.trail} live={state.conn === 'live'} />
          <StatusBoard channels={state.channels} refundSummary={refundSummary} />
        </div>
      </div>

      {fallbackOpen && (
        <FallbackVideo onClose={() => setFallbackOpen(false)} />
      )}
    </main>
  );
}

/** Full-screen recorded-run overlay — the ultimate cannot-crash hook. */
function FallbackVideo({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-label="Recorded demo run"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(3,5,9,0.92)',
        backdropFilter: 'blur(6px)',
        display: 'grid',
        placeItems: 'center',
        padding: 32,
      }}
    >
      <video
        src="/fallback.mp4"
        autoPlay
        controls
        playsInline
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(1100px, 92vw)',
          borderRadius: 18,
          border: '1px solid var(--hairline-strong)',
          boxShadow: 'var(--shadow-pop)',
        }}
      />
    </div>
  );
}
