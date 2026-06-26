# CloseIQ — Talk-Track Notes (not rendered in UI)

## 1. Semantic Layer — how GL ↔ Subledger mismatches are resolved

**Demo talk-track:**

When you demo the Source Quality panel and the auditor asks "how does a GL–subledger mismatch get fixed before the close engine processes it?" — say this:

> "What you're seeing is a _pre-processing_ quality flag. Oracle Fusion's GL shows a different trade-receivables balance than Salesforce's AR sub-ledger. In a manual close, a controller would chase that down by hand — emails, reconciliation spreadsheets, a day or two of back-and-forth.
>
> In this architecture, we have a **semantic layer** sitting between the raw source feeds and the close engine. Data engineers define canonical reconciliation rules there — Fusion GL 1100 must agree with SFDC AR module within AED 50K tolerance; anything outside that gets held and flagged. The platform resolves the discrepancy automatically once the rule is satisfied, or it escalates with a structured root-cause ticket. The controller sees the flag for awareness, not for manual intervention.
>
> This is what we mean when we say the platform 'normalises data before it reaches the close.' It's not magic — it's governed transformation logic that used to live in no-one's job description."

**Key phrase for governance-focused audiences:** "The semantic layer is where your data-quality SLA lives — the close engine only ever sees clean, reconciled data."

---

## 2. PPT Export — starting point, not final deliverable

**Demo talk-track:**

When you click "Export Pack" and the PowerPoint downloads, say this before the audience digs into slide formatting:

> "What you're seeing is a _starting point_, not a finished board pack. The slide structure — executive summary, waterfall, entity heatmap, agent commentary — mirrors what a controller typically assembles manually across four or five tools in a week of work. Here it's generated in seconds.
>
> In a production deployment, your IR or reporting team would apply FinTran's brand template, adjust the slide sequence for your specific CFO preferences, and layer in any non-financial narrative. We can configure those preferences into the system so the starting point is 90% done rather than 70% done. The intent is to eliminate the assembly work, not to replace the judgment of the person who knows the audience."

**Customisation levers to mention if asked:**
- Slide order and which modules appear
- Branding (logo, colour palette, font)
- Commentary tone (executive terse vs. analyst detailed)
- Which comparison layer the waterfall shows (MoM, QoQ, BudY, etc.)
- Language (the commentary engine can output in Arabic)

---

---

## 3. BRS — scope positioning

**Demo talk-track (if the audience asks why BRS is not shown in the live demo):**

> "Bank Reconciliation Statement is fully built into the platform — it's live in the codebase. For today's walkthrough we've kept the focus on intercompany because that's where FinTran's close bottleneck sits, but the BRS module is the same reconciliation engine pointed at a different data feed: Kyriba bank statements versus Oracle Fusion GL cash accounts. We've enabled it for other clients and can light it up as a second lane here — it's a configuration decision, not additional development. Happy to show the BRS screens after this session if useful."

**Key phrase for technical audiences:** "Same pattern-matching rules engine, different source pair — BRS is intercompany recon with banks as the counter-party."

---

## 4. IC scope — 400+ entities and 2,000–2,500 combinations

**Demo talk-track (if the audience quotes the RFP figure of 2,000–2,500):**

> "The RFP scope covers 400-plus legal entities. The 2,000–2,500 figure represents intercompany *combinations* — not unique entity pairs. A 'combination' is a unique pairing of two entities *plus* a transaction type. For example, FinTran Real Estate–01 and Investments–02 alone generate five distinct combinations: sale of goods, intercompany loan, equity investment, cost-sharing agreement, and management fee recharge. Each combination needs its own matching rule, tolerance band, and resolution path. At 400 entities, the universe of pairwise relationships is around 80,000 potential pairs, but only the ~2,000–2,500 commercially active ones require live reconciliation logic. That's the number we're sizing for."

**Key phrase if pushed:** "2,000–2,500 is the number of matching *rules*, not the number of entities — and that's a very tractable configuration problem, not a scale one."

---

*These notes are for the presenting team only. Nothing here is rendered in the CloseIQ UI.*
