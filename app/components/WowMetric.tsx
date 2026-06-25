'use client';

/**
 * app/components/WowMetric.tsx — Agent A (web/UI)
 * ---------------------------------------------------------------------------
 * The hero number: elapsed seconds from the first customer message (t0) until
 * every confirmation lands (tDone / allDone). PRESENTATIONAL ONLY — the parent
 * page owns useEventStream(); we receive t0/tDone/allDone via props.
 *
 * The live clock ticks via requestAnimationFrame (no setInterval drift) and is
 * torn down on unmount and the moment the demo finishes.
 */

import { useEffect, useRef, useState } from 'react';

export interface WowMetricProps {
  /** Epoch ms of the first customer message; null until the clock is armed. */
  t0: number | null;
  /** Epoch ms when the final confirmation landed; null while running. */
  tDone: number | null;
  /** True when refund + email + whatsapp have all delivered. */
  allDone: boolean;
}

type MetricState = 'idle' | 'running' | 'done';

/** Visual progress saturates around this elapsed window (decorative only). */
const PROGRESS_FULL_MS = 45_000;

/** Seconds to one decimal, clamped at zero so we never render "-0.0". */
function formatSeconds(ms: number): string {
  const safe = ms > 0 ? ms : 0;
  return (safe / 1000).toFixed(1);
}

export default function WowMetric({ t0, tDone, allDone }: WowMetricProps): JSX.Element {
  const done = tDone != null || (allDone && t0 != null);
  const state: MetricState = t0 == null ? 'idle' : done ? 'done' : 'running';

  // Live elapsed ms while running; frozen value supplied directly when done.
  const [liveMs, setLiveMs] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Only the running state needs a ticking clock.
    if (state !== 'running' || t0 == null) {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const tick = () => {
      setLiveMs(Date.now() - t0);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [state, t0]);

  // The number on screen, by state.
  const elapsedMs =
    state === 'done' && t0 != null && tDone != null
      ? tDone - t0
      : state === 'running'
        ? liveMs
        : 0;
  const seconds = formatSeconds(elapsedMs);

  // Decorative progress bar width.
  const progressPct =
    state === 'done'
      ? 100
      : state === 'running'
        ? Math.min(100, (elapsedMs / PROGRESS_FULL_MS) * 100)
        : 0;

  return (
    <div className="rc-card rc-metric" data-state={state}>
      <div>
        <div className="rc-metric-label">Resolution time</div>
        <div className="rc-metric-headline">
          {state === 'idle' && 'Ask for a refund to start the clock.'}
          {state === 'running' && 'Resolving live…'}
          {state === 'done' && (
            <>
              Refund resolved + confirmed in <em>~{seconds}s</em>.
            </>
          )}
        </div>
      </div>

      <div className="rc-metric-time" aria-label={`Resolution time ${seconds} seconds`}>
        <span className="num">{seconds}</span>
        <span className="unit">s</span>
      </div>

      <div className="rc-metric-progress" aria-hidden="true">
        <i style={{ width: `${progressPct}%` }} />
      </div>

      <div className="rc-metric-pop" aria-hidden="true" />
    </div>
  );
}
