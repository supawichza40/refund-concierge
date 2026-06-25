/**
 * server/bff/bus.ts — in-process event bus (Agent B owns; A/C depend on the contract)
 * -----------------------------------------------------------------------------------
 * Implements the frozen DemoEventBus contract from shared/events.ts.
 *
 * SERVER-ONLY, in-memory, single-process. The SSE route (app/api/events) reads
 * from it; the orchestrator (server/orchestrator) and BFF routes publish to it.
 *
 * The instance is stashed on globalThis so Next.js dev hot-reload / multiple
 * route module instances all share ONE bus (otherwise SSE subscribers and
 * publishers can end up on different instances and events vanish).
 *
 * This is a working implementation, not a stub — it is plumbing every module
 * relies on, so it must behave correctly from day one.
 */

import type { DemoEvent, DemoEventBus } from '@shared/events';

type Listener = (evt: DemoEvent) => void;

class InProcessBus implements DemoEventBus {
  private listeners = new Set<Listener>();

  publish(evt: DemoEvent): void {
    // Copy to an array so a listener that unsubscribes mid-dispatch is safe.
    for (const listener of [...this.listeners]) {
      try {
        listener(evt);
      } catch {
        // A bad subscriber must never break the publish loop or other listeners.
      }
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Current subscriber count — handy for /api/health diagnostics. */
  get size(): number {
    return this.listeners.size;
  }
}

const GLOBAL_KEY = '__refundConciergeBus__';

function getBus(): InProcessBus {
  const g = globalThis as Record<string, unknown>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = new InProcessBus();
  }
  return g[GLOBAL_KEY] as InProcessBus;
}

/** The shared singleton bus. Import this everywhere; do not `new` your own. */
export const bus: InProcessBus = getBus();
