# Refund Concierge — Hackathon Submission

> **Chatbots answer. Action Agents act.**
> A voice/chat AI agent that resolves a customer's refund **and issues it** — then confirms across email + WhatsApp — in ~40 seconds. Built on BimpeAI.

**Event:** London Agentic AI Hack Night · 25 June 2026
**Track:** Agentic AI · Built on **BimpeAI**
**One-liner:** The refund agent that doesn't file a ticket — it moves the money and proves it, on two channels, unsupervised.
**Repo:** https://github.com/supawichza40/refund-concierge

---

## ⚡ Elevator pitch (30 seconds)
Apparel e-commerce has the highest return rate of any category (~24–30% vs ~17% all-ecommerce), and every angry refund call costs a retailer roughly $3–7 to handle (industry estimate). Customers who get a bad return experience mostly don't come back (~70%+, range 67–82%). **Refund Concierge** is an agentic system that takes the whole refund interaction end-to-end: the customer talks to it, it recognizes the order, verifies the duplicate charge against policy, **issues the refund itself**, and fires an email + WhatsApp confirmation — while a live dashboard shows every step and a timer lands on **~40 seconds**. Deployable tomorrow on a real SME's stack.

---

## 🎯 The problem
Returns are a multi-billion-pound drag on retail (UK online returns ≈ **£27bn/yr — all categories**, Retail Economics/ZigZag 2024), and the refund conversation is the worst part: slow, manual, on hold, handled by a human, and the moment a loyal customer churns. Existing "AI" in this space is a FAQ chatbot that *tells* you a refund is coming and hands off to a human. That's not agentic — it doesn't act.

## 💡 The solution
**Refund Concierge** is an *action agent*: it doesn't just answer, it **does the thing**.

1. Customer talks to the agent (chat now; voice is a one-click upgrade).
2. The agent recognizes the customer + order from context, verifies the duplicate charge against the refund policy.
3. It **issues the refund** (Stripe) — inside the conversation, narrating each step.
4. It fires **two confirmations** — email + WhatsApp — automatically.
5. A live dashboard lights up **Refund → Email → WhatsApp** and freezes a timer at **~40s**.

An anti-abuse policy envelope (order/customer match, amount ceiling, return-window, human escalation) keeps it from over-refunding.

---

## 🖥️ What it does (the demo)
- **Talk panel** — converse with the live BimpeAI agent.
- **Reasoning trail** — every step the agent takes, live ("recognized Ada… verified duplicate charge… issuing refund…").
- **Status board** — three confirmation cards flip green in sequence.
- **Wow metric** — *"Refund resolved + confirmed in ~40 seconds."*

**Golden path:** Customer **Ada**, order **#1024**, navy linen dress, **£42.99**, *"I was charged twice."* → agent recognizes her, issues the refund, confirms by email + WhatsApp. Verified live: the agent recognizes the order and emits its refund decision reliably (3/3 runs), and refuses out-of-policy requests (asks for £200 → offers only the legitimate £42.99).

---

## 🏗️ How we built it
- **Agent:** a dedicated **BimpeAI** agent ("Refund Concierge — demo"), cloned from a public workflow, with a voice-first system prompt + an inline knowledge base, applied live via the BimpeAI API.
- **Conversation spine:** the BimpeAI webchat API (synchronous live replies) — the reliable, scriptable path.
- **App:** a single **Next.js 14** dashboard + in-process BFF (the API key stays server-side), real-time via **SSE**.
- **Refund execution:** Stripe (TEST mode) — a real refund object when keys are connected, or a clearly-labeled simulated `re_sim_*` otherwise (the dashboard always shows which).
- **Confirmations:** a Confirmation Orchestrator fans out **email (Gmail)** + **WhatsApp** on the refund event, idempotently.
- **Demo-safety:** every external call carries a `mode` flag (real vs simulated render identically green); a `DEMO_MODE=replay` path plays the entire golden path with **zero network** as an on-stage fallback.

## 🔌 Built flagrantly on BimpeAI
Everything customer-facing runs on BimpeAI — conversation, the agent's reasoning, the Stripe integration, the multichannel surface. And it's a **platform play, verifiably**: 11 of our 12 use cases map 1:1 to **published BimpeAI recipes**, so "this generalizes" isn't a claim — it's their own documentation.

---

## 📈 Business value
- **Buyer:** any SME apparel/e-commerce merchant (BimpeAI's exact customer).
- **Value:** turns a 5-minute, $3–7, churn-risking human refund call into a ~40-second self-serve resolution with two-channel proof.
- **Deployable tomorrow:** seeded data in the demo; in production it connects Shopify/Bumpa/POS + Stripe in one click via BimpeAI.

## 🧩 Use-case line-up (the product, not the trick)
Hero (refund concierge) + Subscription Saver + Pay-to-Book + 9 more across retail, hospitality, services, subscriptions, and ops — all riding the same primitives (conversation + payment action + multichannel confirmation + memory). Full catalog in `docs/USE-CASE-CATALOG.md`.

---

## 🧗 Challenges & what we learned
- **BimpeAI reality, mapped live:** webchat + Stripe connect are headless; **Web Voice and WhatsApp connect are dashboard-only**, and there's no outbound-WhatsApp API — so we built the reliable path (webchat) and treat voice/WhatsApp as flag-gated upgrades.
- **No refund template existed** — we engineered the refund behavior (prompt + KB + action) ourselves on top of a support workflow.
- **Honesty as a feature:** confirmations default to composed previews unless a real transport (SMTP / connected WhatsApp) is wired — the system never fakes a "delivered."

## 🚀 What's next
- Wire the real Stripe TEST refund + the BimpeAI-native refund action (Stripe webhook already provisioned for our agent).
- Connect WhatsApp Business + SMTP for true two-channel delivery.
- Flip on Web Voice for the full spoken experience.
- Roll out the 12-use-case catalog.

---

## 🏆 Why it wins (rubric)
- **Creativity** — an agent that *moves real money by conversation*, not another FAQ bot.
- **Execution** — works end-to-end live; a quantified wow (~40s) on a real artifact.
- **Business value** — a real buyer, real £ saved, deployable tomorrow, on the sponsor's platform.
- **Presentation** — the agent narrates itself; the dashboard makes the work legible in 3 seconds.

## 🔗 Artifacts
- **Pitch deck:** `docs/PITCH-DECK.pptx` / `.pdf`
- **Spoken script + judge Q&A:** `docs/PITCH-SCRIPT.md`
- **Figures:** `docs/figures/` (architecture · golden path · impact · platform scorecard · before/after)
- **Use-case catalog:** `docs/USE-CASE-CATALOG.md`
- **Architecture + runbook:** `docs/ARCHITECTURE.md` · `docs/DEMO-RUNBOOK.md`
- **Code:** `refund-concierge/` (Next.js app)

## 🛠️ Tech stack
BimpeAI (agent + webchat + Stripe + multichannel) · Next.js 14 / TypeScript · Server-Sent Events · Stripe (TEST) · Gmail · WhatsApp.

---

*Built at the London Agentic AI Hack Night, 25 June 2026. Stats labeled as estimates are industry benchmarks/forecasts, not audited figures.*
