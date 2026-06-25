# Refund Concierge — Demo Polish Checklist (States + Setup + T-minus)

The demo runs as a single Next.js 14 app on `http://localhost:3000`. The golden path is one click-path: presenter types as the customer in **TalkPanel**, the agent streams reasoning into **ReasoningTrail**, three **StatusBoard** cards flip grey -> amber -> green in order (Refund -> Email -> WhatsApp), and the **WowMetric** timer freezes at **~40s** when the last WhatsApp confirmation lands. Everything in this doc serves that one path and makes sure it cannot die on stage.

---

## 1. UI States the dashboard MUST handle

Build target: **agent A**. Every region must render *something deliberate* in every state below — never a blank div, never a raw error, never a crash. A failing channel must never blank the board.

| Region | State | Trigger | Required UI behaviour | Why it matters on stage |
|---|---|---|---|---|
| **TalkPanel** | Pre-Start / idle | Page load, before "Start demo" | Branded calm idle: input focused & enabled, placeholder = real opener (`e.g. "Hi — I think I was charged twice for my order..."`). Preview chip shows seed: **Ada Lovelace · order 1024 · navy linen dress · £42.99**. "Start demo" button primary, pulsing subtly. | First thing judges see. A focused, branded panel reads "ready"; a blank box reads "broken". |
| **TalkPanel** | Active / streaming | Presenter sends the message | Customer bubble appears right-aligned instantly (optimistic). Input disables + shows "agent is working..." so presenter can't double-send. | Prevents the #1 live-demo error: typing twice and firing two runs. |
| **TalkPanel** | Terminal | WhatsApp delivered | Agent closing bubble: "All done, Ada — your £42.99 refund is confirmed." Input re-enabled for optional follow-up but not required. | Gives a clean human-feeling sign-off that matches the StatusBoard greens. |
| **ReasoningTrail** | Pre-Start / empty | Before Start | Idle hint card: "Agent reasoning will appear here." Light skeleton lines (3 greyed placeholder rows), NOT blank. | Sets the expectation that this panel is the "brain"; empty panel looks dead. |
| **ReasoningTrail** | Empty / waiting | Started, no events yet | Spinner + "Waiting for the agent..." within ~300ms of Start. Never blank between click and first `agent.reasoning`. | The 1-2s gap before first token is where blank screens scare presenters. Fill it. |
| **ReasoningTrail** | Active / streaming | `agent.reasoning`, `tool.called` events | Lines append progressively, newest at bottom, auto-scroll. `tool.called` rendered as a distinct pill (mono font, tool name + arg summary, e.g. `issue_refund · order 1024 · £42.99`). Soft fade-in per line (~150ms), no layout jump. | This is the "it's actually thinking" proof. Smooth append = competence; janky jumps = toy. |
| **ReasoningTrail** | Terminal | After last event | Last line settles, auto-scroll stops, subtle "reasoning complete" footer divider. | Signals the brain is done so eyes move to the StatusBoard greens + timer. |
| **StatusBoard** | Pre-Start / initial | Before Start | All three cards (Refund / Email / WhatsApp) render in **grey/pending** with channel icon, title, and "—" status. Mode tag area present but empty. | Judges see the full scope (3 channels) before anything happens — frames the payoff. |
| **StatusBoard** | Active — per card | `status: pending->sent->delivered` per channel | Each card: grey -> **amber (sent)** -> **green (delivered)** with a satisfying ~250ms color+scale transition and a check icon on green. Cards advance in **order Refund -> Email -> WhatsApp**, ~3-4s apart. NOTE: in non-live modes (`skipped`/`card-fallback`) `sent` is the terminal state and the card MUST go full green on `sent` (do not wait for a `delivered` that won't come). | The flip is half the wow. Ordered, spaced flips let judges *follow* the multi-channel action instead of seeing one blur. |
| **StatusBoard** | Error / failed | `error` event, or channel `status: failed` | Only the affected card turns **red** with a calm message ("Couldn't reach WhatsApp — using card fallback"). Other cards keep their state; board never blanks; run continues. Prefer `WHATSAPP_MODE=card-fallback` so WhatsApp green is guaranteed. | One failed channel must not nuke the demo. A calm single red card actually reads as *resilient*. |
| **StatusBoard** | Mode / degraded tags | Resolved flags | Tiny honest tag on each card: refund `LIVE`/`SIM`, email `LIVE`/`SKIPPED`, whatsapp `LIVE`/`AGENT`/`CARD`. Tag is muted; the card still goes full green. | Honesty for judges without killing the win — same green success, small truthful label. |
| **WowMetric** | Pre-Start | Before Start | Big timer reads **`0.0s`**, dim/disarmed, label "Time to full resolution". | Anchors the metric the whole pitch is built around, before the run. |
| **WowMetric** | Active | Arms on Start | Counts up live (1 decimal, monospaced so width doesn't jitter), bright/armed color. | The live count creates tension — judges watch the number climb toward the payoff. |
| **WowMetric** | Terminal | Last WhatsApp `sent`/`delivered` | **Freezes**, large, color-pops to success green, headline appears: **"Refund resolved & confirmed in ~40s."** | THE wow moment. Must be the biggest, crispest thing on screen at the end. Freeze it hard — no drifting timer. |
| **Demo-mode badge** (global) | Always visible | Resolved config flags | Small top-corner badge showing resolved modes, e.g. `STRIPE: TEST · EMAIL: LIVE · WA: CARD · REPLAY: off`. Turns a visible accent when `DEMO_MODE=replay` is active. | Lets the presenter (and honest judges) see exactly what's live vs simulated at a glance; doubles as your "am I in replay?" confidence check. |
| **SSE connection indicator** (global) | Connecting | Page load / EventSource opening | Subtle "connecting..." dot (amber), never a blocking modal. | Removes the scary blank-while-connecting beat. |
| **SSE connection indicator** | Connected | First `heartbeat` / open | Quiet green dot, "live". Heartbeat every 15s keeps it lit. | Presenter's at-a-glance proof the stream is alive before they hit Start. |
| **SSE connection indicator** | Reconnecting | EventSource drops, auto-retry | Dot -> amber "reconnecting...", UI keeps last state, NO crash, NO error toast spam. Auto-recovers silently on reconnect. | Wifi blips on stage are normal. Silent auto-reconnect means the audience never notices. |

---

## 2. Polish details that read as "production quality"

- **Real copy, never placeholder.** Use the seed everywhere: *Ada Lovelace*, *order 1024*, *navy linen dress*, *£42.99 GBP*, issue *"charged twice / duplicate charge"*. Zero `lorem`, `foo`, `test123`, `asdf`, or `John Doe` anywhere a judge could see.
- **Realistic refund confirmation wording.** Email subject: *"Your £42.99 refund for order 1024 is on its way"*; body references the duplicate charge, the navy linen dress, and *"5 business days"* (etaDays). WhatsApp bubble: *"Hi Ada — good news: we've refunded the duplicate £42.99 charge on order 1024. It'll land in ~5 days. — Refund Concierge"*.
- **Coherent visual theme.** One accent color, one font pair, consistent card radius/shadow/spacing across all four regions. Grey/amber/green/red are the only status colors and they mean the same thing everywhere.
- **Ordered, paced card flips.** Refund -> Email -> WhatsApp, ~3-4s apart. Resist firing them simultaneously even if the backend resolves fast — pacing is what lets judges track the story.
- **The wow number is unmissable.** Largest type on the page, monospaced, success-green pop on freeze, with the "~40s" headline directly under it.
- **Smooth, not janky.** All state changes use a transition (~150-250ms ease). No content reflow/jump when reasoning lines append or cards flip. Reserve card height so amber->green doesn't resize.
- **WhatsApp-style bubble for card-fallback.** When `WHATSAPP_MODE=card-fallback`, render a believable WhatsApp chat bubble (green bubble, tail, timestamp, double-tick) so it *looks* like a real send — visually identical success, honestly tagged `CARD`.
- **Email-preview card.** Show the would-be email as a small rendered preview (from/to/subject/first lines) so judges see the actual artifact, not just a green checkmark.
- **No visible console errors.** Open dev-tools during dry-run; fix every red error and unhandled-promise warning. Judges who open the console must see it clean.
- **Favicon + title set.** Tab title = "Refund Concierge", a real favicon (not the Next.js default). Tiny detail, big credibility.
- **Loading/empty states are designed, not afterthoughts.** Every spinner and "waiting..." message uses the same theme and real copy.

---

## 3. The 4 USER (human) pre-demo action-items

These require the human operator and **cannot be done by an agent**. Each one has a safe fallback, so **none of them blocks the demo** — they only upgrade "simulated" to "live".

**(a) Enable Web Voice in the BimpeAI dashboard** — *optional, only for the voice variant.*
- **Do:** Open the BimpeAI dashboard -> toggle **Web Voice ON** (one click).
- **If skipped:** No voice input. **Safe fallback:** chat-typing in TalkPanel is the default path — leave `VOICE_ENABLED=false`. Recommended for stage unless you've rehearsed voice.

**(b) Connect WhatsApp in BimpeAI + open the 24-hour window** — *required for a LIVE WhatsApp send.*
- **Do:** In BimpeAI -> connect WhatsApp. Then, **from the test phone (+447700900123), send one message to the BimpeAI WhatsApp number** to open the 24-hour messaging window. Do this within 24h of showtime.
- **If skipped / window closed:** Live WhatsApp send fails. **Safe fallback:** run `WHATSAPP_MODE=card-fallback` — renders the identical green WhatsApp bubble on the dashboard and **cannot fail**. This is the recommended stage default unless the window is freshly opened and tested.

**(c) Put Stripe TEST-mode keys in `.env.local`** — *for a real TEST Stripe refund object.*
- **Do:** Add `STRIPE_SECRET_KEY=sk_test_...` (TEST mode) to `.env.local`. Optionally open the Stripe TEST dashboard to show the refund object live.
- **If skipped:** No real refund call. **Safe fallback:** `STRIPE_MODE=simulated` produces a `re_sim_*` refund object that looks identical on the card. Demo is unaffected; you just can't click into Stripe to prove it.

**(d) Seed the controllable test inbox + WhatsApp number into `.env.local`** — *so confirmations deliver somewhere the presenter controls.*
- **Do:** Set `DEMO_CUSTOMER_EMAIL=` (an inbox you can show on screen) and `DEMO_CUSTOMER_WHATSAPP=` (a phone you hold). **Or accept the seed defaults** (`demo-customer@example.com` / `+447700900123`).
- **If skipped:** Confirmations go to the seed defaults you may not control. **Safe fallback:** the in-app email-preview card and WhatsApp bubble still show the artifact on the dashboard, so the proof is on screen regardless of where it actually lands.

---

## 4. T-minus pre-demo checklist

### T-30min — build & baseline
- [ ] `git pull` latest
- [ ] `npm install`
- [ ] `npm run build` (catch type/build errors) **or** `npm run dev` for the run
- [ ] If port 3000 is taken: `PORT=3000 npm run dev` (or pick a free port and update the URL/QR)
- [ ] Open `http://localhost:3000` — confirm the branded idle state renders (not blank)
- [ ] Confirm the **demo-mode badge** shows the modes you intend (Stripe TEST/SIM, Email LIVE/SKIPPED, WA CARD/LIVE)
- [ ] Open a **Stripe TEST-mode dashboard** tab (ready to show the refund object if a judge asks)
- [ ] Confirm `public/fallback.mp4` exists and opens (`FALLBACK_VIDEO` path)
- [ ] Confirm screenshots folder (Plan D) is present and current

### T-10min — dry runs & reset
- [ ] **Full DRY-RUN of the golden path** once, end to end (type message -> 3 greens -> timer ~40s)
- [ ] **`POST /api/admin/reset`** after the dry-run to clear state back to seed
- [ ] **DRY-RUN of `DEMO_MODE=replay`** once so you know the live fallback works. With replay armed: `curl http://localhost:3000/api/demo/replay` should return `{"armed":true,...}`, and `curl -X POST http://localhost:3000/api/demo/replay` should stream the full golden path to the dashboard with no network.
- [ ] Reset again after the replay test
- [ ] Confirm **SSE connected** — connection dot green, a `heartbeat` ticked
- [ ] Confirm **three cards reset to grey**
- [ ] Confirm **timer reads `0.0s`**
- [ ] Browser zoom set to **125-150%** for projector legibility

### T-2min — the stage hygiene pass
- [ ] Laptop **Do-Not-Disturb ON**; system notifications disabled
- [ ] Close Slack/Mail/calendar/other apps; close extra browser tabs (keep only dashboard + Stripe)
- [ ] Laptop **plugged in / charged**
- [ ] **Screen mirroring tested** on the actual projector resolution
- [ ] Wifi connected — but remember replay needs **no network**
- [ ] **QR code / stable URL** ready to show
- [ ] Know the **ONE command to flip to replay** (see below) — muscle-memory it

### Showtime — final 10 seconds
- [ ] Dashboard on the projector, idle state showing the seed preview
- [ ] Connection dot **green**, timer **`0.0s`**, three cards **grey**
- [ ] Hand on the keyboard; pitch-architect's narration cued to the click-path
- [ ] Go.

**The ONE command to flip to the live fallback (preferred over the video):**
Decide BEFORE the run which mode you're in. The two ways to fire replay:
1. **Pre-armed (recommended):** start the app with `DEMO_MODE=replay` already set, and bind a hidden "replay" trigger (a `POST /api/demo/replay`) to a key or a small dashboard control. If the live agent stalls, fire it and narrate over it.
2. **Cold flip:** if you were running live and it dies, `Ctrl-C`, then `DEMO_MODE=replay PORT=3000 npm run dev`, reopen the page, and `POST /api/demo/replay`. ~5-10s of restart; narrate while it boots.

**Prefer replay over `fallback.mp4`** — a live (even simulated) UI beats a video every time. Replay deterministically emits the golden-path SSE events on a timer with **no live API and no network**.

---

## 5. On-stage decision tree — "if X fails, do Y"

Stay calm; the narration works over every branch below. Nothing here ends the demo.

```
START the demo
|
+- Live agent is slow / errors mid-run?
|     -> You're already on stage. Narrate calmly ("our agent's
|        coordinating three channels..."), then trigger DEMO_MODE=replay.
|        Same UI, deterministic finish.
|
+- Network / wifi dies?
|     -> DEMO_MODE=replay. It runs fully LOCAL, no network needed.
|        The dashboard plays the identical golden path.
|
+- Whole laptop or app dies / won't start?
|     -> Play public/fallback.mp4 (a flawless pre-recorded run).
|        Narrate over it exactly as if live.
|
+- Projector / screen mirroring dies?
      -> Switch to the screenshots folder (Plan D) on the laptop screen;
         walk the judges through the key frames: idle -> reasoning ->
         3 greens -> ~40s wow number.
```

**Order of preference when something breaks:** live run -> `DEMO_MODE=replay` (local, no network) -> `public/fallback.mp4` -> screenshots. Replay is preferred over the video because a live (even simulated) UI is more convincing than a recording.

---

*Honesty note for pitch-architect:* never claim more than the resolved mode delivers. If `STRIPE_MODE=simulated`, say "the agent issues a refund" not "a real Stripe charge was reversed." If `WHATSAPP_MODE=card-fallback`, the bubble is a faithful preview of the message, not proof of delivery. The greens are real *flow*; the tags tell the truth about *liveness*.
