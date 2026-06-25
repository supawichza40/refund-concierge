# Confirmation Orchestrator (Agent C)

`onRefundIssued(ctx)` fans out the **email** + **WhatsApp** refund confirmations
on independent promises (one failing never blocks the other), emitting
`status` / `email.sent` / `whatsapp.sent` / `error` events on the shared bus
(`@server/bff/bus`) that the SSE hub streams to the dashboard.

**Idempotent on `ctx.refundId`** — calling it twice for the same refund is a
no-op the second time.

## Files

| File | Role |
|------|------|
| `index.ts` | Fan-out entry point `onRefundIssued(ctx)` (+ `runConfirmations` alias). Emits the `refund`/`email`/`whatsapp` status lifecycle. |
| `email.ts` | Transport-abstracted email channel. Real SMTP send OR composed preview. |
| `whatsapp.ts` | WhatsApp channel: `card-fallback` (default) / `agent-turn` / `live`. |
| `compose.ts` | Pure copy generation (subject/plain/html, WhatsApp body) + the `::CARD::` encoding the dashboard reads. No I/O, no secrets. |

## Default behaviour (no creds — the demo-safe path)

Everything lights the StatusBoard **green end-to-end** with zero setup, while
staying honest via the `mode` field and a per-channel card chip.

- **Email** → `EmailMode: 'skipped'`. The email is **fully composed**
  (subject + plain-text + HTML, populated from `seed.json`: amount, order,
  refund ref, ETA) and emitted as a rendered "email sent" card. Status caps at
  **`sent`** ("composed & queued"); the card chip reads `composed` — we never
  claim `delivered` without a real send.
- **WhatsApp** → `WhatsAppMode: 'card-fallback'`. The message is composed and
  shown as a WhatsApp-style card; status caps at **`sent`**, chip = `composed`.
- **Refund** → emitted as `delivered` with the real `RefundMode`
  (`stripe` | `simulated`) the BFF passed on `ctx.mode`.

The full composed content rides inside `StatusEvent.detail` as
`"<summary> ::CARD:: <json>"`. Agent A decodes it with `parseCard(detail)`
(re-exported from this module) to render the card; a consumer that ignores the
marker just shows the leading summary.

## Status events emitted

Per run (default mode), in order, all with `demoId = refundId`:

```
status   refund    delivered  mode=<stripe|simulated>
status   email     pending    mode=<live|skipped>
status   whatsapp  pending    mode=card-fallback
email.sent          to=<email>  mode=skipped   (messageId omitted)
status   email     sent       mode=skipped     detail carries the EmailCard
whatsapp.sent       to=<wa>     mode=card-fallback
status   whatsapp  sent       mode=card-fallback  detail carries the WhatsAppCard
```

`delivered` is additionally emitted for email/whatsapp **only** when a real
provider receipt exists. On a channel failure: an `error` event +
`status … failed` for that channel only (the other channel is unaffected).

## How to make EMAIL real

**Option A — SMTP (automatic, no code change).** Install nodemailer and set
SMTP creds; the next refund sends a real email.

```bash
npm i nodemailer            # optional dep — the app runs fine without it
```
```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=you@gmail.com
SMTP_PASS=<16-char Gmail App Password>   # App Password, NOT your login password
SMTP_FROM="Refunds <you@gmail.com>"      # optional; defaults to SMTP_USER
SMTP_SECURE=true                          # optional; auto-true on port 465
```

With creds **and** nodemailer present, `email.ts` sends via SMTP, emits
`email.sent` with a real `messageId`, and the status reaches `sent`
(`mode: 'live'`) — plus a `delivered` once the relay accepts. Keep
`EMAIL_LIVE` unset/`true`; set `EMAIL_LIVE=false` to force composed-only.

> The running Node app **cannot** call Claude's Gmail MCP at runtime, so SMTP is
> the only fully-automatic real-send path.

**Option B — Claude Gmail MCP at demo time (no SMTP).** Run in the default
composed mode, then have Claude actually send the draft. The composed copy is
byte-for-byte what gets sent:

1. Read the composed email off the dashboard card, or call
   `composeEmail(ctx)` (exported from this module) to get `{subject, text, html}`.
2. Have Claude send it via the Gmail MCP, e.g.
   `mcp__claude_ai_Gmail__create_draft` (then send) to `ctx.customer.email`.

## How to make WHATSAPP real

**Option A — agent-turn (recommended for the demo; no provider needed).**
The confirmation is delivered as the BimpeAI agent's **closing conversation
turn** in the connected WhatsApp/web chat.

1. Connect WhatsApp in the BimpeAI dashboard (Channels → WhatsApp).
2. Set `WHATSAPP_MODE=agent-turn`.
3. Add to the BimpeAI agent's workflow / system prompt:
   > After a refund is issued, close the conversation by sending the customer a
   > confirmation: amount, order id, refund ref, and the ETA. Keep it to one
   > short WhatsApp-style message.

   The confirmation then arrives in-thread as the agent's last turn. Status
   shows `mode: 'agent-turn'`.
4. *(Optional)* wire `deliverAsAgentTurn()` in `whatsapp.ts` to POST the
   composed message back into the BimpeAI webchat session if you'd rather the
   orchestrator drive the closing turn than rely on the agent's own prompt.

**Option B — live provider.** Implement `sendViaProvider()` in `whatsapp.ts`
against a WhatsApp Business API / Twilio number and set `WHATSAPP_MODE=api`
(→ `'live'`). On a real receipt the status reaches `delivered`. (No Twilio key
is configured today, so `live` falls back to a composed card until wired.)
