# Margaryan Distribution

Autonomous **sales + SMM + distribution OS** for Margaryan Labs products.

Give the system a high-level job such as:

> Sell Hay Engine to US dental clinics and run a 14-day content + outbound campaign.

It turns the job into a governed execution loop:

**COMMAND → PRODUCT BRAIN → PLAN → RESEARCH → QUEUE → POLICY → APPROVAL → EXECUTE → OBSERVE → SUMMARIZE → LEARN → NEXT ACTION**

## V0.4 — No database distribution workforce

V0.4 intentionally does **not require Supabase or any database**. The runtime uses a typed in-memory store.

Implemented:
- Command Center UI
- Product Brain for reusable product/ICP/proof/objection context
- Public-web B2B lead research + fit scoring
- EN/RU mission planning
- OpenAI Responses API planner
- mission + action queue in memory
- approval / reject / execute flows
- dry-run provider execution by default
- worker contract without database dependency
- SMM content-pack generator for X / LinkedIn / Instagram
- connection center
- Gmail / X / LinkedIn / Instagram / Twilio provider adapters
- OpenAI Realtime voice gateway foundation
- post-call summarizer
- compliance gate and opt-out / do-not-call hooks
- responsive dashboard

### Important limitation

Product brains, missions, leads, actions and content are process-memory only and can reset after restart or serverless cold-start. Persistent database work is intentionally deferred; V0.4 does not initialize or call any database runtime.

## Run

```bash
cp .env.example .env.local
npm install
npm run typecheck
npm run dev
```

External side effects are disabled by default with `EXECUTION_ENABLED=false`. Approvals and execution can therefore be tested end-to-end without sending anything externally.

Realtime voice runs separately in `voice-gateway` because Twilio Media Streams use a long-lived WebSocket connection.
