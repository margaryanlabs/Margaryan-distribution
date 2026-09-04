# Margaryan Distribution

Margaryan Distribution is an autonomous distribution operating system for products, brands, and campaigns.

It turns one high-level instruction such as **“Sell Hay Engine to US dental clinics”** or **“Run distribution for VETO Intelligence”** into a governed execution plan across sales and content channels.

## Product thesis

One command → research → strategy → content/outreach → channel execution → replies → follow-up → calls → qualification → handoff → analytics.

The platform is built around four layers:

1. **Command Center** — user gives the goal, product, target market, language, budget and autonomy level.
2. **Agent Planner** — converts the goal into tasks and channel-specific actions.
3. **Channel Executors** — Gmail, X, LinkedIn, Instagram, voice/Twilio and future adapters.
4. **Distribution Memory** — CRM, conversation summaries, content history, experiments, metrics and next-best-action.

## V1 scope

- EN/RU first
- Product knowledge profiles
- Distribution missions and campaigns
- Lead CRM and outreach queue
- Email sending adapter (Gmail)
- X post adapter
- LinkedIn post adapter for approved API access
- Instagram publishing adapter for eligible professional accounts
- Twilio outbound call adapter + realtime voice gateway contract
- Content calendar and SMM queue
- Approval gates per channel/action
- Compliance/quiet-hours/opt-out controls
- Activity timeline and campaign analytics
- OpenAI-powered structured planning

## Safety model

Margaryan Distribution never treats “autonomous” as “unbounded.” Every action has a channel policy and one of three execution modes:

- `AUTO` — can execute without approval when credentials and policy allow it.
- `APPROVE` — agent prepares the action; a human approves before execution.
- `BLOCKED` — action is not allowed by the configured policy, account permissions, or channel rules.

Cold outreach, automated calling, recording, and social automation must respect applicable laws, platform terms, opt-outs and account permissions.

## Stack

- Next.js 16 / React 19 / TypeScript
- Supabase (Auth + Postgres + RLS)
- OpenAI Responses API for planning and structured outputs
- OpenAI Realtime + Twilio Media Streams for voice
- Official channel APIs only

## Getting started

```bash
cp .env.example .env.local
npm install
npm run dev
```

Then create a dedicated Supabase project and run the SQL in `supabase/migrations/001_core.sql`.

## Repository status

V1 foundation is being implemented. External actions remain disabled until their credentials are configured.
