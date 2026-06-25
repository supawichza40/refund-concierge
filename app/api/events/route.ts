/**
 * app/api/events/route.ts — SSE hub (Agent B owns)
 * ------------------------------------------------------------------
 * GET /api/events  →  text/event-stream
 *
 * Subscribes the connection to the in-process bus and streams every DemoEvent
 * as an SSE frame. Emits a heartbeat every HEARTBEAT_MS so the dashboard never
 * shows a dead connection. Cleans up the subscription + interval on disconnect.
 *
 * This is the consume side of the frozen SSE contract (shared/events.ts).
 * The dashboard (Agent A) connects here via app/hooks/useEventStream.ts.
 */

import { bus } from '@server/bff/bus';
import {
  EVENT,
  HEARTBEAT_MS,
  makeEvent,
  toSseFrame,
  type DemoEvent,
} from '@shared/events';

// SSE must run on the Node runtime and must never be statically cached.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  const encoder = new TextEncoder();

  // Cleanup handles shared across start()/cancel() and the abort listener.
  let unsubscribe = () => {};
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let closed = false;

  const cleanup = () => {
    if (closed) return;
    closed = true;
    if (heartbeat) clearInterval(heartbeat);
    unsubscribe();
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (frame: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(frame));
        } catch {
          cleanup();
        }
      };

      // Initial heartbeat so the client knows the stream is live immediately.
      send(toSseFrame(makeEvent(EVENT.HEARTBEAT, { ts: Date.now() }, 'hub')));

      unsubscribe = bus.subscribe((evt: DemoEvent) => send(toSseFrame(evt)));

      heartbeat = setInterval(() => {
        send(toSseFrame(makeEvent(EVENT.HEARTBEAT, { ts: Date.now() }, 'hub')));
      }, HEARTBEAT_MS);

      // Fires when the client disconnects (browser closes the EventSource).
      req.signal.addEventListener('abort', () => {
        cleanup();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
