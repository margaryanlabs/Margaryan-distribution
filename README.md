# Margaryan Distribution

Autonomous **sales + SMM + distribution OS** for Margaryan Labs products.

Give the system a high-level job such as:

> Get five qualified Promptence agency pilots in Dubai and run the supporting content + outbound campaign.

It turns the job into a governed execution loop:

**COMMAND → PRODUCT BRAIN → PLAN → RESEARCH → QUEUE → POLICY → APPROVAL → EXECUTE → OBSERVE → SUMMARIZE → LEARN → NEXT ACTION**

## V0.6 — Portfolio Director

V0.6 adds a portfolio-level control plane on top of the existing distribution workforce.

Implemented:
- Command Center UI
- Product Brain for reusable product / ICP / proof / objection context
- portfolio catalog + bootstrap for Promptence, VETO Intelligence, Meqena, RAIOS and INGU
- Portfolio Director that advances active missions across products
- hourly Vercel Cron entry point at `/api/portfolio/tick`
- versioned Supabase checkpoint adapter with memory fallback
- optimistic checkpoint conflict detection
- public-web B2B lead research + fit scoring
- EN/RU mission planning
- OpenAI Responses API planner
- mission + action queue
- ordered outbound dependencies and stale-sequence suppression
- approval / reject / execute flows
- dry-run provider execution by default
- SMM content-pack generator for X / LinkedIn / Instagram
- connection center
- Gmail / X / LinkedIn / Instagram / Twilio provider adapters
- OpenAI Realtime voice gateway foundation
- post-call summarizer
- compliance gate and opt-out / do-not-call hooks
- responsive dashboard

## Runtime modes

Without `DISTRIBUTION_SUPABASE_URL` and `DISTRIBUTION_SUPABASE_SERVICE_ROLE_KEY`, the app remains backward-compatible and runs from process memory.

With a dedicated Margaryan Distribution Supabase project:
1. apply `docs/distribution-runtime-state.sql` to that project;
2. set the two server-only Vercel environment variables;
3. the API/autopilot/portfolio boundaries hydrate the latest checkpoint before work and persist a versioned snapshot after work.

The service-role key must never be exposed to the browser or committed to Git.

## Portfolio automation

`vercel.json` schedules `GET /api/portfolio/tick` hourly (`0 * * * *`). The route requires `CRON_SECRET` and Vercel sends that value as a Bearer token. It bootstraps missing portfolio Product Brains, advances active missions, polls the known-lead inbox, prepares research/outreach/SMM work, and executes only actions that already pass existing policy/autonomy gates.

`EXECUTION_ENABLED=false` remains the safe default. Cron does not override channel policy, approval mode, opt-out, do-not-call, voice-jurisdiction or daily-limit controls.

## Run

```bash
cp .env.example .env.local
npm install
npm run typecheck
npm run dev
```

External side effects are disabled by default with `EXECUTION_ENABLED=false`.

Realtime voice runs separately in `voice-gateway` because Twilio Media Streams use a long-lived WebSocket connection.
