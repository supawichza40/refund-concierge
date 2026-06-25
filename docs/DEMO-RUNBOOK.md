# Refund Concierge — Demo Runbook (the rehearsable golden path)

The single, exact, rehearsable click-path for the 3-minute live judge demo. Every presenter utterance, the expected agent reply, the moment each event fires, and the wow-metric reveal — mapped beat-by-beat to `docs/PITCH-SCRIPT.md` timings.

**Run it the same way every time.** Demoable beats complete; deterministic beats clever.

- **App:** single Next.js app, `http://localhost:3000`. SSE live stream at `GET /api/events`.
- **Customer (frozen seed):** Ada Lovelace · `demo-customer@example.com` · `+447700900123`.
- **Order (frozen seed):** id **1024** · **navy linen dress** · **£42.99 GBP** · issue **"charged twice / duplicate charge"** · ETA **5 days**.
- **The wow moment:** three green checkmarks (Refund -> Email -> WhatsApp) and the timer landing on **"Refund resolved & confirmed in ~40s."**
- **Two ways to run it:** LIVE (real BimpeAI/Stripe/Gmail or their flagged fallbacks) or REPLAY (`DEMO_MODE=replay`, deterministic, no network). Both produce the **identical** dashboard. See section 4.

---

## 0. One-time before you walk on (see DEMO-POLISH-CHECKLIST.md §3-4)

1. `npm install` then `npm run dev` (or `PORT=3000 npm run dev` if 3000 is taken).
2. Open `http://localhost:3000`. Confirm: SSE dot **green**, three cards **grey**, timer **0.0s**, demo-mode badge shows your intended modes.
3. Do one full **dry-run** of this runbook, then `POST /api/admin/reset`.
4. Do one **replay dry-run** (`DEMO_MODE=replay`, then `POST /api/demo/replay`) so you know the fallback works. Reset.
5. Browser zoom 125-150%, Do-Not-Disturb on, `public/fallback.mp4` present.

---

## 1. The golden path, beat-by-beat (mapped to PITCH-SCRIPT timings)

> Times are the pitch-script clock. The pitch demo section is **SLIDE 6, 0:45-2:10**; the wow metric is **SLIDE 7, 1:40-1:55**. POINT AT SCREEN throughout; narrate the action, don't read the slide. Slow down here — this is the hero.

| Pitch time | Presenter action / utterance | What the agent / system does | Event(s) on the bus -> SSE | Dashboard reaction |
|---|---|---|---|---|
| **0:45** | Click **Start demo**. Say: *"We hit Start — and the timer arms."* | `POST /api/session/start` resets state from `seed.json`, returns the seed + public flags. Dashboard opens SSE, arms the WowMetric timer. | (session start; SSE already streaming `heartbeat`) | Timer **arms and begins counting**. Cards grey. Reasoning trail empty/idle. |
| **0:50** | Type as Ada into TalkPanel (visibly, do not paste): **"I want a refund for order 1024 — the navy linen dress, I was charged twice."** Press Enter. Say: *"Our customer is Ada. She types..."* | Message sent to the BimpeAI agent (webchat) or, in stub/replay, the canned path. Input disables ("agent is working..."). | `agent.reasoning` (customer message echoed) | Customer bubble appears. Reasoning trail shows the inbound message. |
| **1:00** | Say: *"Watch the reasoning panel. The agent recognises Ada, pulls order 1024 — £42.99 — checks the return window. Every tool call, live."* **PAUSE 2s while it runs.** | Agent reasons over the inline KB: identifies the customer, looks up the order, verifies the duplicate charge against the refund policy. | `agent.reasoning` (recognise Ada) -> `tool.called: lookup_customer` -> `agent.reasoning` (pull order 1024, £42.99) -> `tool.called: lookup_order` -> `agent.reasoning` (duplicate confirmed vs policy) -> `tool.called: check_refund_policy` | Reasoning trail **populates line by line**; tool calls render as distinct pills. Cards still grey. |
| **1:15** | Say: *"Now — it doesn't send a ticket to a human. It calls Stripe."* (slight emphasis on "calls Stripe"). **PAUSE while it fires.** | Agent decides it is eligible and calls its `issue_refund` action -> Stripe TEST refund (or simulated `re_sim_*`). | `agent.reasoning` (issuing refund) -> `tool.called: issue_refund` | Reasoning trail shows the `issue_refund` pill. Refund card pending. |
| **1:22** | Say: *"Refund issued."* Let it breathe one beat. | BFF catches + validates the refund event, emits `refund.confirmed`, then invokes the Confirmation Orchestrator. | `refund.confirmed { orderId:1024, amount:42.99, currency:GBP, mode }` -> orchestrator emits `status: refund -> delivered` | **Refund card flips -> GREEN** ("Refund issued"). |
| **1:26** | Say: *"Email sent."* | Orchestrator fans out the email confirmation (Gmail live, or `skipped` with on-screen preview). | `status: email -> pending` -> `status: email -> sent` -> `email.sent { to: demo-customer@example.com, mode }` | **Email card flips -> GREEN** ("Email sent"). Email-preview card visible. |
| **1:30** | Say: *"WhatsApp confirmation — gone."* **SHORT PAUSE.** | Orchestrator fans out the WhatsApp confirmation (live, or `card-fallback` rendering a WhatsApp-style bubble). | `status: whatsapp -> pending` -> `status: whatsapp -> sent` -> `whatsapp.sent { to: +447700900123, mode }` | **WhatsApp card flips -> GREEN** ("WhatsApp sent"). WhatsApp bubble visible. |
| **1:35** | Say: *"Three green checkmarks. Unsupervised."* **PAUSE 2s — let the judges stare at the three greens.** | (terminal) | — | All three cards **GREEN**. |
| **1:40** | Say: *"And the timer stops."* (POINT at the WowMetric) | Last confirmation (`whatsapp.sent`) is the trigger to freeze the timer. | (driven by `whatsapp.sent`) | **Timer FREEZES**, pops to success green. |
| **1:40-1:55** | **SLIDE 7.** Say slowly: *"Refund resolved and confirmed — in around forty seconds."* **PAUSE.** Then: *"Not a ticket in a queue that takes hours. Not a three-to-seven-dollar support call. Forty seconds. Machine cost."* | (the reveal) | — | WowMetric shows the big headline: **"Refund resolved & confirmed in ~40s."** This is THE wow moment. |

From **1:55** onward the demo is done; the presenter moves to SLIDE 8 (business value) over the resolved dashboard. Leave the three greens + ~40s metric on screen.

### Card-flip order is deliberate
Refund -> Email -> WhatsApp, ~3-4s apart. Even if the backend resolves faster, the dashboard paces the flips so judges can follow the multi-channel action as a story. WhatsApp is last and is the timer-stop trigger.

---

## 2. Expected agent reply (the one assistant turn judges may see)

If the dashboard surfaces the agent's natural-language reply (TalkPanel), the canned/stub reply (and the shape the live agent is steered toward) is:

> "I've found order #1024 for a navy linen dress at £42.99. I can see it was charged twice. I'll issue a refund for the duplicate charge now — you'll get a confirmation by email and WhatsApp shortly."

Optional closing bubble after the three greens:

> "All done, Ada — your £42.99 refund is confirmed."

Keep the spoken narration consistent with this: **navy linen dress, £42.99, charged twice** — never "jacket" or "$42".

---

## 3. Exact event sequence (verified)

This is the precise SSE event order the dashboard receives, **verified by running the replay end-to-end** (`DEMO_MODE=replay` -> `POST /api/demo/replay`, captured over `GET /api/events`). The LIVE path produces the same sequence (the BimpeAI webhook supplies the reasoning/tool/refund-confirmed front half; the orchestrator supplies the status/sent back half).

```
heartbeat                              (every 15s, keep-alive)
agent.reasoning   "Customer message received: ...order 1024 — navy linen dress — charged twice"
agent.reasoning   "Recognising customer: Ada Lovelace (cust_ada)."
tool.called       lookup_customer  { id: cust_ada }
agent.reasoning   "Pulling order 1024 — navy linen dress, £42.99 GBP."
tool.called       lookup_order     { orderId: 1024 }
agent.reasoning   "Order shows a duplicate charge ... eligible for a full refund of the duplicated amount."
tool.called       check_refund_policy { orderId: 1024, eligible: true }
agent.reasoning   "Eligible. Issuing a refund of £42.99 ... confirmation by email and WhatsApp."
tool.called       issue_refund     { orderId: 1024, amount: 42.99, currency: GBP }
refund.confirmed  { refundId: re_sim_*, orderId: 1024, amount: 42.99, currency: GBP, mode }   <- Refund card GREEN
status            refund    -> delivered (mode)                                                <- (orchestrator-owned)
status            email     -> pending (live|skipped)
status            email     -> sent
email.sent        { to: demo-customer@example.com, mode }                                      <- Email card GREEN
status            whatsapp  -> pending (live|card-fallback)
status            whatsapp  -> sent
whatsapp.sent     { to: +447700900123, mode }                                                  <- WhatsApp card GREEN -> stop timer
```

Verified counts in one replay run: 5x `agent.reasoning`, 4x `tool.called`, 1x `refund.confirmed`, 1x `email.sent`, 1x `whatsapp.sent`, single `refund -> delivered` status (no double card-flip). Dashboard action completes in ~18-20s; the "~40s" is the framed story metric the WowMetric displays on terminal.

> Note on terminal states: in `skipped` (email) and `card-fallback` (whatsapp) modes the orchestrator's terminal status is **`sent`** (not `delivered`) — the cards MUST go full green on `sent`. Only live-mode sends emit a trailing `delivered`. Agent A: treat `sent` as success for non-live modes.

---

## 4. The two run modes (identical dashboard, different source of events)

### LIVE (default; the real thing)
- Requires the human pre-demo items as available (DEMO-POLISH-CHECKLIST §3); each missing one auto-degrades to a flagged fallback that **looks identical** (simulated refund / skipped-email-with-preview / WhatsApp card).
- Path: presenter types -> BimpeAI agent -> `issue_refund` -> Stripe TEST (or simulated) -> BFF webhook emits `refund.confirmed` -> orchestrator fans out email + WhatsApp.

### REPLAY (`DEMO_MODE=replay`; the cannot-crash fallback) — VERIFIED
- **What it is:** a server-side module (`server/replay.ts`) that publishes the **exact** golden-path event sequence above to the same in-process bus the SSE hub reads — with **no BimpeAI / Stripe / Gmail / WhatsApp call and no network**. It reuses the **real orchestrator** for the email + WhatsApp fan-out, so the back half is byte-identical to a live run; only the reasoning/tool/refund-confirmed front half is canned from `seed.json`.
- **How to arm it:** set `DEMO_MODE=replay` in `.env.local` (default is `off`) and start the app. The trigger route **refuses to fire** unless armed, so it can never go off during a real live run.
- **How to trigger it:**
  - Probe (does not fire): `GET /api/demo/replay` -> `{"armed":true,"demoMode":"replay"}`.
  - Fire: `POST /api/demo/replay` -> streams the full golden path to the dashboard; returns `{ ok:true, demoId, refundId }`.
- **On stage:** bind the `POST` to a key or a small dashboard control, or just have a terminal ready with `curl -X POST http://localhost:3000/api/demo/replay`. Narrate over it exactly as the live path — the judges cannot tell the difference.
- **Re-runnable:** a re-entrancy guard prevents overlapping replays; it releases ~4s after a run so you can fire it again for a second take without a restart.

**Fallback ladder:** LIVE -> `DEMO_MODE=replay` (local, no network) -> `public/fallback.mp4` -> screenshots. Replay is preferred over the video — a live (even simulated) UI beats a recording.

---

## 5. Reset between runs

`POST /api/admin/reset` clears the in-memory state back to `seed.json`. Do this after every dry-run and before the real run. Confirm: three cards grey, timer 0.0s, SSE dot green. (If running replay, no reset is strictly required between fires — each emits a fresh `demoId` — but resetting gives the cleanest visual start.)

---

## 6. The single most important rule

**Type the message exactly, hit the beats slowly, and let the three greens + ~40s sit.** If anything feels wrong before you start — fire `DEMO_MODE=replay`. The script in `PITCH-SCRIPT.md` works identically over live, replay, or the recorded video. The demo cannot die.
