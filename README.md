# Margaryan Distribution

Autonomous **sales + SMM + distribution OS** for Margaryan Labs products.

Give the system a high-level job such as:

> Get five qualified Promptence agency pilots in Dubai and run the supporting content + outbound campaign.

It turns the job into a governed execution loop:

**COMMAND → PRODUCT BRAIN → PLAN → RESEARCH → QUEUE → POLICY → APPROVAL → EXECUTE → OBSERVE → SUMMARIZE → LEARN → NEXT ACTION**

## V0.15 — Governed Execution Planner

V0.15 turns Decision Engine recommendations into concrete staged operating plans without bypassing human approval or provider safety gates.

New in V0.15:
- two-phase workflow: Preview plan → Stage governed plan
- decision directives translate into concrete preparation steps for priority accounts, controlled content experiments, research increments and evidence re-measurement
- planner-created outreach is forced to `APPROVE` even when a mission is configured for auto
- content experiments create drafts and governed publish actions; staging never publishes directly
- internal research and learning actions are queued for approval instead of running immediately
- plan IDs are attached to generated actions so repeated staging does not duplicate campaigns or outbound work
- internal research/analyze work no longer consumes email-send daily limits
- `/api/intelligence/execution-plan` supports read-only preview and durable governed staging

## V0.14 — Decision Engine

V0.14 upgrades Intelligence from a read-only dashboard into an evidence-ranked operating decision layer.

New in V0.14:
- deterministic Decision Engine over existing CRM, learning and performance evidence
- ranked directives across accounts, channels, ICP segments, offers, quality and operational health
- conservative channel postures: `increase_test`, `keep_testing`, `rework`, or `insufficient_evidence`
- Top-5 account queue scored from stage, priority, fit, buying signals, value, reachability and next-action urgency
- safeguards against false causality: scale guidance means controlled experiments, not automatic budget increases
- overdue-account, approval-bottleneck, execution-exception and low-quality interventions
- `/api/intelligence/decisions` exposes mission-scoped decision output without mutating CRM state

## V0.13 — Three-Space Revenue OS

V0.13 reorganizes Margaryan Distribution around three primary operating workspaces instead of a flat collection of tools.

Primary workspaces:
- **Revenue** — accounts, outreach, replies, meetings, pipeline and verified revenue
- **Marketing** — campaigns, content, channels, demand and performance handoff
- **Intelligence** — executive readout, commercial funnel, learning rankings, next-best-actions, quality and runtime risk

New in V0.13:
- new `/intelligence` Decision Intelligence workspace using existing CRM, performance, learning, quality and operations evidence
- executive readout and operator attention are visible beside mission-level commercial intelligence
- channel and pillar rankings are consolidated with next experiments instead of living in isolated analytics screens
- quality and runtime risk are surfaced in the same decision layer without inventing attribution
- the global dock now treats Revenue / Marketing / Intelligence as the three primary workspaces
- Leads / Inbox / Meetings remain fast flow tools while Command, Products, Connections, Autopilot, Quality, Operations, Analytics, Calls and Brief move under System
- legacy drill-down pages remain available and unchanged for detailed inspection

## V0.12 — Marketing Command

V0.12 turns the legacy SMM workspace into a demand and distribution cockpit instead of a simple content generator.

New in V0.12:
- `/smm` is now Marketing Command / Demand Engine with mission and Product Brain context
- content is connected visually to impressions, engagement, clicks, replies, meetings and verified revenue
- channel intelligence compares LinkedIn, X, Instagram and email using the existing performance evidence
- campaign learning recommendations and production health are visible beside the channel matrix
- the editorial queue surfaces status, quality, scheduling and media blockers
- the repurpose flow is upgraded into a dedicated channel-pack studio
- the global workspace dock now highlights the current workspace and prioritizes Revenue + Marketing
- the legacy Command Center no longer hardcodes V0.4 memory/no-database claims and now prefers Promptence context

## V0.11.2 — Durable Autopilot Guard

V0.11.2 fails closed before autonomous portfolio work if the runtime has no durable CRM.

New in V0.11.2:
- both scheduled GET ticks and worker/operator POST ticks require durable storage before the portfolio director can run
- a memory-only deployment returns 503 before research, inbox processing or external action execution can begin
- this prevents a split-brain deployment from sending real outbound work that cannot be durably reconciled back into CRM state

## V0.11.1 — Promptence Autopilot Cost Guard

V0.11.1 keeps the hourly seller useful without letting research spend scale accidentally.

New in V0.11.1:
- Promptence missions are prioritized in portfolio ticks so the first internal customer cannot be starved by other active missions
- autonomous Promptence research defaults to one new account per tick and can be tuned with `PROMPTENCE_AUTOPILOT_RESEARCH_PER_TICK`
- known companies/domains are passed into research exclusions before every autonomous research call to reduce duplicate search and token waste
- health/version reporting now matches the deployed package version

## V0.11 — Revenue Close Loop

V0.11 closes the operator gap between outreach and verified pipeline movement.

New in V0.11:
- one Promptence Human Revenue Queue for first touch, follow-up, inbound replies and approved meeting bookings
- reply and meeting work is prioritized above cold outreach so warm demand is not buried
- verified Google Calendar bookings now move the lead to `meeting`, set the next action to meeting preparation, and stop remaining cold outreach
- each real provider-accepted booking records an idempotent meeting performance event instead of leaving calendar truth disconnected from CRM truth
- the same conversion synchronization runs for both background AUTO execution and explicit operator execution

## V0.7 — Promptence Revenue Machine

V0.7 keeps Margaryan Distribution as a standalone multi-product distribution OS, but makes **Promptence the first internal customer** and adds a real product-specific sales motion instead of generic lead scoring.

New in V0.7:
- dedicated `/sales` Revenue Command Center for Promptence
- structured ICP segments, buyer roles, trigger signals, qualification rules and disqualifiers
- current Promptence offer ladder: free signal, $39/$129/$349 self-serve, $1,500 Diagnostic, $3,500 Remediation Sprint, $7,500 Infrastructure
- evidence-backed lead fields: segment, buying signals, pain hypotheses, priority, qualification reasons/gaps, recommended offer and offer value
- Promptence-specific minimum qualification score before sequence preparation
- outreach copy uses actual researched signals and sells the next logical commitment rather than the whole platform
- safe `/api/sales/promptence/advance` loop prepares research/outreach/learning without directly executing outbound actions
- Product Brain catalog refreshes existing seeded products so the latest commercial truth reaches durable state
- revenue cockpit explicitly separates potential offer value from verified revenue

## V0.6 — Portfolio Director

V0.6 added a portfolio-level control plane on top of the existing distribution workforce.

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
