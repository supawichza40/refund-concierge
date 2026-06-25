'use client';

/**
 * app/components/ReasoningTrail.tsx — Agent A (web/UI)
 * ---------------------------------------------------------------------------
 * A live, animated vertical trail of the agent's work, assembled UPSTREAM by
 * useEventStream() from our own status/reasoning/tool events (BimpeAI gives us
 * final text only — the hook folds it into TrailStep[]). This component is
 * purely presentational: it renders the steps, animates entrances via the CSS
 * in globals.css, and auto-scrolls to the newest step.
 *
 * The parent page owns the single useEventStream() instance and passes the
 * folded trail down as props. We never call the hook here.
 */

import { useEffect, useRef } from 'react';
import type { TrailStep } from '../hooks/useEventStream';
import { IconBrain, IconTool, IconCheck } from './icons';

export interface ReasoningTrailProps {
  /** The folded reasoning/tool/milestone trail from useEventStream(). */
  steps: TrailStep[];
  /** Whether the SSE stream is connected — tunes the empty/idle copy. */
  live?: boolean;
}

/** Map a step kind to its node icon. */
function nodeIcon(kind: TrailStep['kind']) {
  switch (kind) {
    case 'tool':
      return <IconTool aria-hidden="true" />;
    case 'milestone':
      return <IconCheck aria-hidden="true" />;
    case 'reasoning':
    default:
      return <IconBrain aria-hidden="true" />;
  }
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * Relative time from the first step (e.g. "+12.3s"). When this is the only
 * step (no baseline yet) we show the wall clock instead, so the very first
 * entry still carries a timestamp rather than a flat "+0.0s".
 */
function stepTime(ts: number, firstTs: number | null, isOnly: boolean): string {
  if (isOnly || firstTs == null) {
    const d = new Date(ts);
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  }
  const deltaS = Math.max(0, (ts - firstTs) / 1000);
  return `+${deltaS.toFixed(1)}s`;
}

export default function ReasoningTrail({ steps, live = false }: ReasoningTrailProps) {
  // Defensive: never trust the prop to be a real array on a partial render.
  const safeSteps: TrailStep[] = Array.isArray(steps) ? steps : [];
  const listRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to the newest step whenever the trail grows.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [safeSteps.length]);

  const hasSteps = safeSteps.length > 0;
  const firstTs = hasSteps ? safeSteps[0].ts : null;
  const onlyOne = safeSteps.length === 1;

  return (
    <section className="rc-card rc-trail" aria-label="Agent reasoning trail">
      <div className="rc-card-head">
        <span className="rc-card-eyebrow">
          <IconBrain aria-hidden="true" />
          Reasoning trail
        </span>
      </div>

      <div className="rc-card-body">
        {hasSteps ? (
          <div className="rc-trail-list" ref={listRef} role="log" aria-live="polite">
            {safeSteps.map((step) => (
              <div className="rc-step" data-kind={step.kind} key={step.id}>
                <div className="rc-step-node">{nodeIcon(step.kind)}</div>
                <div>
                  <div className="rc-step-text">{step.text}</div>
                  <div className="rc-step-time">{stepTime(step.ts, firstTs, onlyOne)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rc-empty">
            <span className="icon">
              <IconBrain aria-hidden="true" />
            </span>
            <p style={{ margin: 0 }}>
              {live
                ? 'Listening… the agent’s reasoning will appear here as it works.'
                : 'Waiting for the agent.'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
