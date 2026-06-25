# Refund Concierge — Workspace

End-to-end demo for the **London Agentic AI Hack Night**: a **Voice Refund Concierge** built on **BimpeAI**, wrapped in a custom demo dashboard, with **email (Gmail) + WhatsApp** confirmation. Built for a 3-minute live judge demo — biased to *cannot crash*.

> This is a handoff-ready workspace. Any agent or person can pick up a module below without breaking the others, **as long as the frozen contract files are respected** (see "Rules").

## What it does (golden path)
Customer speaks to the agent → agent looks up the seeded order → issues a Stripe **test** refund → backend catches the event → **email** (Gmail draft/send) + **WhatsApp** confirmation fire → the dashboard status board lights up **Refund → Email → WhatsApp** → big wow-metric: *"refunded in ~40s."*

## Stack
Single **Next.js 14** app (App Router). API routes are the BFF in-process → the `BIMPEAI_API_KEY` stays server-side, no separate service to run. Real-time via **SSE**.

## Structure
```
refund-concierge/
├─ web/                  # dashboard UI — talk panel · reasoning trail · status board · wow metric   (owner: build agent A)
├─ server/
│  ├─ bff/               # API routes: BimpeAI client, session token, webhook→bus→SSE              (owner: build agent B)
│  ├─ orchestrator/      # on refund.issued → email (Gmail) + WhatsApp fan-out, status events       (owner: build agent C)
│  └─ config.ts          # FROZEN — feature flags + mode auto-detection
├─ shared/
│  ├─ types.ts           # FROZEN — shared types
│  └─ events.ts          # FROZEN — event names + payload shapes
├─ seed.json             # FROZEN — the one seeded demo customer + order
├─ public/               # static assets + fallback demo video
└─ docs/
   └─ ARCHITECTURE.md    # the full build-ready architecture spec
```

## Rules (so parallel work doesn't collide)
1. **Freeze first:** `shared/types.ts`, `shared/events.ts`, `server/config.ts`, `seed.json` are the contract. Agree changes before editing; everyone imports from `shared/`, nobody redefines.
2. **Module ownership:** A = `web/`, B = `server/bff/`, C = `server/orchestrator/`. Stay in your folder.
3. **Demo-safety:** every external call carries a `mode` field; the dashboard renders the same green card whether real or simulated. Fallbacks are config flags in `config.ts`, never rewrites.
4. **Secrets:** real keys live only in `.env.local` (git-ignored). Never `NEXT_PUBLIC_` the key. Never print/commit it.

## Run
```bash
cp .env.local.example .env.local   # fill in BIMPEAI_API_KEY + demo customer
npm install
npm run dev                          # http://localhost:3000
```

## Status
- ✅ Wave 0: recon + architecture + confirmation spec (see `docs/ARCHITECTURE.md`)
- ⏳ Wave 1: build (BimpeAI agent · dashboard · orchestrator · seed/golden-path) — pending
- ⏳ Wave 2: sell kit · Wave 3: red-team + QA · Wave 4: docs→Notion

## Prerequisites on the human
- Provide **1 test email inbox** + **1 test WhatsApp number** (pre-message the BimpeAI WhatsApp number once to open the 24h window) so confirmations deliver live.
- Some BimpeAI steps are dashboard-only (enable Web Voice, connect Stripe/WhatsApp) — you'll be flagged with exact clicks.
