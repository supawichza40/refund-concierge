---
marp: true
theme: default
paginate: true
size: 16:9
style: |
  section {
    background-color: #0d1117;
    color: #ffffff;
    font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
    font-size: 22px;
    padding: 48px 64px;
  }
  h1 {
    font-size: 64px;
    font-weight: 800;
    color: #ffffff;
    line-height: 1.1;
    margin-bottom: 16px;
  }
  h2 {
    font-size: 42px;
    font-weight: 700;
    color: #ffffff;
    line-height: 1.2;
    margin-bottom: 20px;
  }
  h3 {
    font-size: 28px;
    font-weight: 600;
    color: #39d353;
    margin-bottom: 12px;
  }
  strong {
    color: #39d353;
  }
  em {
    color: #a8d8a8;
    font-style: normal;
  }
  ul {
    margin: 0;
    padding-left: 28px;
  }
  li {
    margin-bottom: 12px;
    font-size: 22px;
    line-height: 1.4;
  }
  p {
    font-size: 22px;
    line-height: 1.5;
    margin-bottom: 12px;
  }
  .metric {
    font-size: 108px;
    font-weight: 900;
    color: #39d353;
    line-height: 1.0;
    display: block;
    margin: 20px 0;
    letter-spacing: -2px;
  }
  .metric-label {
    font-size: 28px;
    color: #a8d8a8;
    font-weight: 600;
  }
  .subtitle {
    font-size: 26px;
    color: #39d353;
    font-weight: 600;
    margin-bottom: 8px;
  }
  .tagline {
    font-size: 32px;
    color: #ffffff;
    font-weight: 700;
    margin-top: 24px;
  }
  .byline {
    font-size: 18px;
    color: #6e7681;
    margin-top: 32px;
  }
  .step {
    background: #161b22;
    border-left: 4px solid #39d353;
    padding: 14px 20px;
    margin: 10px 0;
    border-radius: 0 8px 8px 0;
    font-size: 22px;
  }
  .callout {
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 8px;
    padding: 20px 24px;
    margin: 10px 0;
    font-size: 21px;
  }
  .truth-badge {
    font-size: 14px;
    color: #6e7681;
    font-style: italic;
  }
  footer {
    font-size: 14px;
    color: #30363d;
  }
  section::after {
    color: #30363d;
    font-size: 14px;
  }
---

<!-- _paginate: false -->

# Refund Concierge

<div class="subtitle">💸 → ✅ in one conversation</div>

<div class="tagline">"Refund resolved + confirmed in ~40 seconds."</div>

<br>

### Chatbots answer. Action Agents act.

<div class="byline">Built on BimpeAI · London Agentic AI Hack Night</div>

---

## 🛍️ The Pain: Apparel Returns Are Broken

<br>

**Apparel = the highest-return category**
~24–30% return rate vs ~17% across all e-commerce

**Every return = a support contact**
A real person, a ticket queue, a wait.

**UK online returns cost retailers ~£27bn/yr**
*(all UK online returns — Retail Economics / ZigZag, 2024)*

<br>

> A founder is still answering *"where's my refund?"* at 11pm.

---

## 💸 The Cost Twist

<br>

Each refund support call costs **$3–7**
*(industry estimate)*

<br>

**~70%+ of shoppers won't reshop after a bad return experience**
*(range 67–82% — Coresight / NRF / Shopify 2024)*

<br>

A slow refund is a **double loss:**
cost now + **churn forever.**

---

## 💡 The Insight

<br>

Support bots **talk**.
Nobody trusts them to **act**.

<br>

The unlock isn't better answers.

It's an agent **trusted to move money**
— and **prove it.**

<br>

<div class="tagline">Chatbots answer. Action Agents act.</div>

---

## ✅ The Solution: Refund Concierge

<br>

Customer talks → agent **recognizes** customer + order

→ **issues the refund itself** (real Stripe TEST refund)

→ **confirms** via Email + WhatsApp

<br>

One conversation. Zero tickets. Zero humans.

<br>

*Built on BimpeAI. Deployable tomorrow.*

---

## 🎬 Live Demo

<br>

<div class="step">🔍 <strong>Recognize</strong> — Ada + order #1024 (£42.99, charged twice)</div>
<div class="step">💳 <strong>Refund</strong> — real Stripe TEST refund (or clearly-labeled simulated re_sim_*)</div>
<div class="step">📧 <strong>Email</strong> — confirmation fires via Gmail ✅</div>
<div class="step">📱 <strong>WhatsApp</strong> — second confirmation channel ✅</div>

<br>

*Dashboard: talk panel · reasoning trail · status board · wow-metric timer*

---

<!-- _class: metric-slide -->

## ⏱️ The Number

<br>

<span class="metric">~40s</span>
<span class="metric-label">Refund resolved + confirmed</span>

<br>

**vs. human path:** ticket queue · $3–7 call (industry estimate) · hours to days

---

## 📈 Business Value

<br>

**Deflects $3–7 support calls** *(industry estimate)* — at machine cost

<br>

**Saves the 70%+ at-risk repeat buyer**
A fast refund is **retention**, not a cost

<br>

**The return tide isn't shrinking**
~£27bn all UK online returns/yr; apparel (~24–30%) generates the most contacts

<br>

<span class="truth-badge">All figures sourced; estimates labeled as estimates</span>

---

## 🧩 The Platform Play

<br>

Same primitives: **conversation + Stripe + confirmation + memory**

<br>

<div class="callout">🏆 <strong>Refund Concierge</strong> — issues refund, confirms across 2 channels</div>
<div class="callout">🔄 <strong>Subscription Saver</strong> — pause / downgrade / cancel a Stripe sub; recovers MRR</div>
<div class="callout">📅 <strong>Pay-to-Book Appointment Agent</strong> — takes a deposit, books the slot</div>

<br>

*Each one is a published BimpeAI recipe — a recipe swap, not new infrastructure.*

---

## 🚀 Why Us · Why Now

<br>

**Why now**
Voice + agentic tool-use are finally **reliable enough to trust with money**
Customers already live in WhatsApp
Cost of every call rises as margins shrink under returns

<br>

**Why this stack**
BimpeAI wires conversation → Stripe → email + WhatsApp in a dashboard afternoon

<br>

*Honest: demo is one golden path. The platform is the bet.*

---

<!-- _paginate: false -->

## 🏁 The Ask

<br>

<span class="metric" style="font-size:72px;">~40 seconds.</span>

**Chatbots answer. Action Agents act.**

<br>

We're asking for:
- **🏆 The prize**
- **🤝 A pilot with a DTC apparel brand**

<br>

<div class="byline">Built on BimpeAI · London Agentic AI Hack Night · github: refund-concierge</div>
