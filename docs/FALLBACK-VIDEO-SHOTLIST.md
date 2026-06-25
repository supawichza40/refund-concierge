# Refund Concierge — Fallback Video Shot List & Narration

## 1. Why this exists

This document is the **Plan C** recovery kit: a pre-recorded, flawless run of the demo that we cut to mid-narration if the live demo dies on stage. Our software fallback is **Plan B** (`DEMO_MODE=replay` — a deterministic, offline replay that emits the exact same events with no live API calls); this video is what we play **only if even the replay fails** because the venue network drops or the laptop dies entirely.

**Order of fallbacks:** Plan A (live) → Plan B (`DEMO_MODE=replay`) → Plan C (this recorded video) → Plan D (static screenshots).

---

## 2. Recording setup

Prep the machine and capture so the recording itself is deterministic and clean.

| Setting | Value |
|---|---|
| Resolution | 1920x1080 |
| Frame rate | 30fps (60fps acceptable) |
| Capture tool | macOS `Cmd+Shift+5` (record selected window) or QuickTime -> New Screen Recording |
| Capture scope | The browser **tab/window only** — not the full desktop |
| Notifications | Do Not Disturb / Focus ON. Hide the menu bar. Silence Slack, Mail, calendar. |
| Browser zoom | **125-150%** so the status cards and the timer read on a projector |
| Tabs | Close every other tab; full-screen the dashboard |
| App run mode | Run with **`DEMO_MODE=replay`** so the recorded run is itself deterministic and cannot stutter — record the replay (best of both: looks live, behaves perfectly) |
| Takes | Record **2-3 takes**, keep the cleanest |
| Target length | **60-90 seconds** of footage |
| Export (video) | `public/fallback.mp4` — H.264, under 20MB |
| Export (GIF) | `public/fallback.gif` — looping, for embedding in a slide |

Quick prep checklist before you hit record:
- [ ] `DEMO_MODE=replay` set, app running at `http://localhost:3000`
- [ ] Dashboard full-screen, zoom 125-150%, all four panels visible
- [ ] Status cards (Refund / Email / WhatsApp) all **grey** at rest
- [ ] Timer reads `0.0s` and is armed-but-not-started
- [ ] Do Not Disturb on, menu bar hidden, other tabs closed
- [ ] URL bar shows a clean `localhost:3000` (no query strings, no tokens)

---

## 3. The shot list

Video-relative timecodes start at `0:00`. The narration column quotes the pitch lines; during live playback the presenter talks over the muted video, so these are timing targets, not hard cuts. Card flips must be **~3-4s apart** and each must be clearly visible.

| Shot # | Timecode | On-screen action | What's visible | Narration line | Capture note |
|---|---|---|---|---|---|
| 1 | 0:00-0:03 | Hold on the clean, idle dashboard. No cursor movement. | All 4 panels; 3 grey cards; timer `0.0s` | *(silent open — let the UI breathe)* | 3s static hold. Establishes the product. |
| 2 | 0:03-0:06 | Cursor moves to and clicks **Start demo**. Timer arms and begins counting. | Timer ticks from `0.0s`; cards still grey | "We hit Start — and the timer arms." | Show the click clearly. Brief 0.5s hold on the armed timer. |
| 3 | 0:06-0:16 | Type the customer message **visibly, character by character** into the Talk/chat panel. Do **not** paste. | Chat input filling with Ada's text | "Our customer is Ada. She types: I want a refund for order 1024..." | Type the exact line: **"I want a refund for order 1024 — the navy linen dress, I was charged twice."** Then press Enter. |
| 4 | 0:16-0:30 | Reasoning & tool-call trail populates **line by line** on the right. | Trail entries appear in sequence: recognises **Ada Lovelace** -> pulls **order 1024** -> item **navy linen dress** -> amount **£42.99 GBP** -> flags **duplicate charge** -> checks **refund policy / return window** | "Watch the reasoning panel. The agent recognises Ada, pulls order 1024 — £42.99 — checks the return window. Every tool call, live." | Let each line land with a small beat. This is the credibility shot — don't rush it. |
| 5 | 0:30-0:34 | Trail shows the **Stripe (TEST mode)** call firing — a distinct `issue_refund` entry. | `issue_refund` tool-call line in the trail; Refund card still grey but pending | "Now — it doesn't send a ticket to a human. It calls Stripe." | Hold ~1s on the Stripe line so it's unmistakable. |
| 6 | 0:34-0:38 | **Refund** card flips grey -> green. | Refund card green, label **"Refund issued"** | "Refund issued." | First green. Clear, isolated flip. If too fast, add a 0.5s hold. |
| 7 | 0:38-0:42 | **Email** card flips grey -> green (~3-4s after Refund). | Email card green, label **"Email sent"** | "Email sent." | Second green. Same spacing as Shot 6. |
| 8 | 0:42-0:46 | **WhatsApp** card flips grey -> green (~3-4s after Email). | WhatsApp card green, label **"WhatsApp sent"** | "WhatsApp confirmation — gone." | Third green. Same spacing. |
| 9 | 0:46-0:48 | Hold on all **three green checkmarks** together. No motion. | Refund + Email + WhatsApp all green; three checkmarks | "Three green checkmarks. Unsupervised." | **Pause 2s.** This is the proof-of-autonomy beat — let it sit. |
| 10 | 0:48-0:51 | Timer **stops**. | Timer freezes; Wow-Metric panel resolves | "And the timer stops." | Show the moment the number locks. |
| 11 | 0:51-0:54 | Wow-Metric lands on the headline number. | Big metric: **"Refund resolved & confirmed in ~40s."** | "Refund resolved and confirmed — in around forty seconds." | **3s hold** on the `~40s` metric. This is THE wow moment — make it unmissable. |
| 12 | 0:54-0:56 | Final tasteful hold on the resolved state, then **fade**. | Three green cards + the `~40s` metric, then fade to black/blank | *(silent close)* | 2s hold -> fade. End of footage. |

Total footage ~56s of action; pad the open/close to land in the 60-90s target.

> Note on the timer number: the on-screen replay completes its dashboard action in ~18-20s. The "~40s" is the *story* metric (refund resolved AND both confirmations delivered, framed against a human support queue). The WowMetric component displays the framed "~40s" headline on terminal; the live count is secondary. Coordinate the exact displayed number with Agent A so the video matches the live UI.

---

## 4. Narration audio

**Preferred: leave the video silent and narrate live during playback.** The presenter talks over the muted video, so timing flexes to the room and the cut can join mid-sentence without an audio clash. This is the safer choice for a live-crash fallback.

**If you want baked-in audio** (e.g. for an unattended loop on a slide), record this one-paragraph VO over the footage:

> "This is Refund Concierge. We hit Start, and the clock begins. Our customer, Ada, types a single message: she wants a refund for order 1024, the navy linen dress — she was charged twice. Watch the reasoning panel: the agent recognises Ada, pulls up order 1024 at £42.99, sees the duplicate charge, and checks it against the refund policy. Then it doesn't open a ticket for a human — it calls Stripe directly. Refund issued. Email sent. WhatsApp confirmation, gone. Three green checkmarks, fully unsupervised — and the timer stops. Refund resolved and confirmed, in around forty seconds."

Keep the VO paced to the card flips (one beat per green) so it stays in sync if the video loops.

---

## 5. Editing checklist

- [ ] Trim dead air at the head and tail; keep the open hold <=3s.
- [ ] Each card flip (Refund -> Email -> WhatsApp) is **clearly visible** and ~3-4s apart. If any flip is too fast to read, **add a 0.5s hold** on that frame.
- [ ] The **`~40s`** metric reads clearly and gets its full 3s hold.
- [ ] **No secrets on any frame:** scan the URL bar (no query tokens), confirm **no `.env` file**, **no dev-tools / console** open, no API keys or Stripe secret keys visible anywhere.
- [ ] **No real personal data** — only the seeded persona (Ada Lovelace, `demo-customer@example.com`, `+447700900123`).
- [ ] Typed customer message matches the frozen seed exactly: **navy linen dress / order 1024 / £42.99 / charged twice** (NOT "jacket" or "$42").
- [ ] Cursor never reveals a bookmarks bar, other tabs, or a notification toast.
- [ ] Export filenames are **exactly** `public/fallback.mp4` (H.264, <20MB) and `public/fallback.gif` (looping).
- [ ] Spot-check the GIF still reads legibly after compression — bump the dimensions if the cards blur.

---

## 6. How it plugs in

- The dashboard has a **`FALLBACK_VIDEO=true`** flag. When set, it surfaces a **"Play recorded run"** button that plays `/public/fallback.mp4` **full-screen** — the one-click Plan C from inside the app itself.
- **Dead-simple Plan C:** keep `fallback.mp4` **open in a desktop media player** (QuickTime, full-screen, ready to hit space) so you can cut to it instantly even if the app won't load at all.
- **Plan B is separate and preferred over this video:** `DEMO_MODE=replay` runs the real dashboard with deterministic events and **looks live** — reach for the replay first; this recording is only for when the laptop or venue network is fully down.

---

*Consistency note for `pitch-architect`:* the shot list and VO use the **frozen seed** (navy linen dress / £42.99 / charged twice), which intentionally overrides the pitch script's stale "jacket / $42" wording. Make the spoken narration match the video and the seed beat for beat.
