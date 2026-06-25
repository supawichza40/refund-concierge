# BimpeAI Action Agents — Use-Case Catalog

**One line:** Not a chatbot. An agent that *does the thing* — moves money, books the slot, confirms across channels — then proves it happened.

> **Verification note for judges & deck builders.** Every adjacent use case below maps to a *documented BimpeAI recipe* (docs.bimpe.ai/docs/use-cases) or rides the exact primitives our hero demo already wires up (conversation → Stripe → email/WhatsApp confirmation). This is a published product surface, not a wishlist. Stats are triangulated and flagged where they are estimates.

---

## 1. The Hero Use Case — Context-Aware Refund Concierge

**What it is.** A voice/chat agent for apparel e-commerce that recognises the customer and their order, hears the complaint in plain language, *decides and issues the Stripe refund itself*, and confirms by email **and** WhatsApp — in under a minute, with no human in the loop.

**Who it's for.** The SME apparel store / DTC brand drowning in "where's my refund" tickets. Buyer = the founder or head of CX who is personally answering those tickets at 11pm.

**The £ value.**
- Apparel has the **highest return rate of any category — ~24–30% online vs ~17% all-ecommerce** (Coresight, Prime-AI, NRF/Shopify 2024). Every one of those returns generates a contact.
- A human-handled support call runs **~$3–7 (industry estimate)**; the agent resolves it for cents and in seconds.
- **~70%+ of shoppers are less likely to buy again after a poor returns experience** (range 67–82% across 2023–24 studies). A fast, dignified refund is *retention*, not just cost-saving.

**The 40-second wow.** Customer says *"This jacket doesn't fit, I want my money back."* On screen: the agent finds order **#1024**, confirms it's Ada, issues the **Stripe refund**, and the status board lights up **Refund → Email → WhatsApp** ending on one number: **"Refunded in ~40s."** No forms. No queue. No agent.

**Why it's novel (the wedge).** A FAQ bot *talks*. This agent **acts + moves real money + confirms across two channels** — the three things a support chatbot has never been trusted to do unsupervised. That's the entire pitch: judges have seen 100 RAG chatbots; they have not seen one issue a refund live on stage and prove it landed.

---

## 2. Adjacent Use Cases — the same primitives, a whole product line

Every card below = **conversation + Stripe + confirmation + memory**. The agentic *action* is the bold verb. ★ = mapped to a published BimpeAI recipe.

| # | Use case | Who buys it | Agentic action it takes | Channel | Business value | Build on BimpeAI |
|---|----------|-------------|-------------------------|---------|----------------|------------------|
| 1 | **Refund Concierge** (HERO) ★ | DTC / apparel CX lead | Looks up order → **issues Stripe refund** → confirms email+WhatsApp | Web Voice + chat | Deflects $3–7 calls; saves the 70%+ at-risk repeat buyer | 🟢 |
| 2 | **Order-Issue Resolver** (wrong/late/damaged item) ★ | Any e-com store | Diagnoses → **issues partial refund OR triggers replacement** via REST | Chat + WhatsApp | Resolves the #2 ticket type without a human; protects review scores | 🟢 |
| 3 | **Subscription Saver / Manager** ★ | SaaS, box subscriptions, gyms | **Pauses, downgrades, or cancels** the Stripe subscription on request + confirms | Chat + voice | Cuts involuntary churn; "pause not cancel" save-flow recovers MRR | 🟢 |
| 4 | **Pay-to-Book Appointment Agent** ★ | Salons, clinics, photographers, tutors | Checks calendar → **takes Stripe deposit/payment** → books slot → confirms WhatsApp | Voice + chat | Kills no-shows (paid deposit); books 24/7 with zero front-desk time | 🟢 |
| 5 | **Restaurant / Table + Deposit Agent** ★ | Restaurants, event venues | Books table → **charges deposit** → sends WhatsApp confirmation + reminder | Voice + WhatsApp | Recovers no-show revenue; frees host stand on phone | 🟡 |
| 6 | **Payment & Invoice Reminder Agent** ★ | Services SMEs, freelancers, B2B | Detects overdue invoice → **sends pay link, takes Stripe payment** in-thread | WhatsApp + chat | Pulls forward cash; cuts DSO without an awkward chase call | 🟢 |
| 7 | **Fraud / Transaction Verification Agent** ★ | Finance-lite, marketplaces | On flagged charge, **confirms or reverses** via REST → logs + notifies | WhatsApp + voice | Stops fraud loss in seconds; the "is this you?" call, automated | 🟡 |
| 8 | **Lost / Stolen Card Support** ★ | Fintech, neobanks | Verifies identity → **freezes card via REST API** → confirms + reissues | Voice + chat | Replaces the panicked 2am call-centre queue; contains loss | 🟡 |
| 9 | **Flash-Sale / Back-in-Stock Concierge** ★ | DTC retail | Notifies → takes the order → **charges via Stripe** before stock goes | WhatsApp + chat | Converts intent at the peak moment; recovers abandoned demand | 🟢 |
| 10 | **Hotel Reservation & Concierge** ★ | Boutique hotels, B&Bs | Books room → **takes payment** → upsells → confirms email+WhatsApp | Voice + WhatsApp | 24/7 front desk; captures direct bookings off OTA fees | 🟡 |
| 11 | **Event / Class Booking + Ticketing** ★ | Studios, gyms, workshops | Books class → **charges ticket** → manages waitlist → confirms | Chat + WhatsApp | Fills classes automatically; recoups admin hours | 🟢 |
| 12 | **Warranty / Goodwill-Credit Agent** | Electronics, premium goods | Validates claim window → **issues store credit or partial refund** | Chat + voice | Standardises goodwill spend; turns a complaint into loyalty | 🟡 |

**Difficulty legend.** 🟢 deployable tomorrow on documented primitives (Stripe + chat/voice + confirmation). 🟡 needs one REST/calendar integration or a verification gate, still in-envelope. (No 🔴 here on purpose — everything in this catalog is buildable; flag scope honestly rather than over-promising.)

**Verticals covered:** retail (1,2,9,12), subscriptions (3), services (4,11), hospitality (5,10), finance-lite (6,7,8), ops (2). One product line, six markets — the SME doesn't care which box it's in; they care that it *acts*.

---

## 3. Platform Thesis (slide-worthy)

> **Category: "Action Agents — assistants that take real money + commitment actions, with built-in multichannel confirmation."** Chatbots answer; action agents *commit*. Every high-value SME conversation ends in the same three moves — **decide, transact (Stripe), and confirm (email + WhatsApp)** — and BimpeAI is the only stack where an SME wires that in a dashboard afternoon across voice, chat, and WhatsApp. The refund concierge is one expression of a primitive that resells across retail, services, hospitality, and finance-lite. **Why now:** voice + agentic tool-use are finally reliable enough to trust with money, customers already live in WhatsApp, and the labour cost of every $3–7 call is rising while margins shrink under return pressure. The wedge is *trust to act* — and confirmation-by-default is what earns it.

---

## 4. Tiered Rollout Story (roadmap, not toy)

**Today (the demo).** One agent, one golden path: voice refund concierge → Stripe refund → email + WhatsApp confirmation, live on stage in ~40s. *Proves the hard part — an agent moving real money and proving it.*

**Next 30 days (the product line).** Same primitives, new verbs: turn on Subscription Saver (#3), Pay-to-Book (#4), Invoice Reminder (#6). Each is a recipe swap on the platform we just demoed — no new infrastructure. *Proves it's a line, not a one-trick.*

**The platform (the bet).** Action Agents as a category. Add Telephony (real phone calls — already a BimpeAI add-on), more action integrations via the custom REST API, and a recipe marketplace where any SME picks a verb and ships. *The agent layer that SMEs trust to act on their behalf — the thing every vertical SaaS will need and few can build.*

---

## 5. ROI Talking Points (3, honestly flagged)

1. **The return tide is a cost engine.** UK returns cost retailers **~£27bn/yr** (Retail Economics/ZigZag, 2024 — *all-category UK returns*, not apparel-only), and apparel returns at **~24–30%** generate the most contacts of any category. The agent deflects those contacts at machine cost. *Hard sources; the £27bn is total-UK, don't relabel it apparel.*

2. **Every deflected call is margin.** A human-handled support call costs **~$3–7 (industry estimate — flag as estimate)**; the agent resolves the same refund for cents in seconds. At apparel return volumes that is a five-figure-plus annual line item for a mid-size DTC store. *Estimate, stated as such.*

3. **A good refund is retention, not just cost.** **~70%+ of shoppers won't buy again after a poor returns experience** (range 67–82%, multiple 2023–24 studies). A 40-second dignified refund flips the single biggest churn trigger in e-commerce into a reason to come back. *Directional; cite the range, not a false-precise single number.*

---

### Slide picks — show these 3
- **Hero (Refund Concierge)** — the live wow; the only one you *demo*.
- **Subscription Saver (#3)** — instantly legible "this is a platform" proof; different vertical, identical primitives, recovers revenue (judges love MRR).
- **Pay-to-Book Appointment Agent (#4)** — broadest SME appeal (any local service business), and visibly *not* e-commerce — that's what sells "platform, not feature."

*Why these three: one proves the hard thing works, two prove it generalises across verticals, and all three are 🟢 buildable — so the roadmap reads as credible, not aspirational.*
