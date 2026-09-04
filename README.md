# Margaryan Distribution

Autonomous **sales + SMM + distribution OS** for Margaryan Labs products.

Give the system a high-level job such as:

> Sell Hay Engine to US dental clinics and run a 14-day content + outbound campaign.

It turns the job into a governed execution loop:

**COMMAND → PLAN → QUEUE → POLICY → APPROVAL → EXECUTE → OBSERVE → SUMMARIZE → LEARN → NEXT ACTION**

## V0.2 — No database mode

V0.2 intentionally does **not require Supabase or any database**. The runtime uses a typed in-memory store so product work can continue while the production backend is being prepared separately.

Implemented:

- Command Center UI
- EN/RU mission planning
- OpenAI Responses API planner
- mission + action queue in memory
- approval / reject / execute flows
- dry-run provider execution by default
- 24/7 worker contract without database dependency
- SMM content-pack generator for X / LinkedIn / Instagram
- connection center
- Gmail / X / LinkedIn / Instagram / Twilio provider adapters
- OpenAI Realtime voice gateway foundation
- post-call summarizer
- compliance gate and opt-out / do-not-call hooks
- responsive dashboard

### Important limitation

The in-memory store is intentionally temporary. Data survives only for the life of the running Node process and can reset on restart or serverless cold-start. This is correct for V0.2 development and demonstrations, not production persistence.

The existing Supabase migration files are parked for later and are not used by the V0.2 runtime.

## Run

```bash
cp .env.example .env.local
npm install
npm run typecheck
npm run dev
```

External side effects are disabled by default:

```env
EXECUTION_ENABLED=false
```

With this setting, approvals and executions run end-to-end but provider calls are simulated. Only turn live execution on after the required official provider credentials and channel policy checks are configured.

## Voice

Realtime voice runs as a separate gateway because Twilio Media Streams use a long-lived WebSocket connection:

```bash
cd voice-gateway
npm install
npm start
```

See `docs/ARCHITECTURE.md` for the execution model.
