import seed from '@/seed.json';
import type { DemoSeed } from '@shared/types';

/**
 * Placeholder dashboard shell — Agent A (web/UI owner) replaces the inner
 * panels with <TalkPanel/>, <ReasoningTrail/>, <StatusBoard/>, <WowMetric/>
 * wired to the SSE stream via app/hooks/useEventStream.ts.
 *
 * This boots TODAY against the frozen seed so `npm run dev` works before any
 * module is filled in.
 */
export default function Page() {
  const { customer, order } = seed as DemoSeed;
  const amount = `${order.currency === 'GBP' ? '£' : ''}${order.amount.toFixed(2)}`;

  return (
    <main className="rc-shell">
      <header className="rc-header">
        <div>
          <div className="rc-title">Refund Concierge</div>
          <div className="rc-sub">Voice agent → refund → email + WhatsApp confirmation</div>
        </div>
        <span className="rc-badge">demo mode · scaffold</span>
      </header>

      <div className="rc-grid">
        <section className="rc-card">
          <h2>Talk panel</h2>
          <div className="rc-placeholder">
            Agent A mounts the BimpeAI Web Voice widget (or the webchat fallback)
            here, and a “Start demo” button that calls <code>POST /api/session/start</code>.
          </div>
        </section>

        <section className="rc-card">
          <h2>Seeded golden-path data</h2>
          <div className="rc-kv">
            <div><span>customer&nbsp;</span><b>{customer.name}</b></div>
            <div><span>email&nbsp;</span><b>{customer.email}</b></div>
            <div><span>whatsapp&nbsp;</span><b>{customer.whatsapp}</b></div>
            <div><span>order&nbsp;</span><b>#{order.id}</b> — {order.item}</div>
            <div><span>amount&nbsp;</span><b>{amount}</b></div>
            <div><span>issue&nbsp;</span><b>{order.issue}</b></div>
            <div><span>eta&nbsp;</span><b>{order.etaDays} days</b></div>
          </div>
        </section>

        <section className="rc-card">
          <h2>Reasoning trail</h2>
          <div className="rc-placeholder">
            Agent A renders <code>agent.reasoning</code> / <code>tool.called</code> events
            streamed from <code>GET /api/events</code> (SSE).
          </div>
        </section>

        <section className="rc-card">
          <h2>Status board</h2>
          <div className="rc-placeholder">
            Three cards — Refund · Email · WhatsApp — driven by <code>status</code> events.
            Each lights green on <code>delivered</code>; the wow-metric timer stops on the
            final confirmation.
          </div>
        </section>
      </div>
    </main>
  );
}
