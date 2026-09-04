# Margaryan Distribution

Autonomous **sales + SMM + distribution OS** for Margaryan Labs products.

Give it a high-level mission such as:

> Sell Hay Engine to US dental clinics and run a 14-day content + outbound campaign.

The system turns the goal into research, channel strategy, social content, personalized outreach, follow-up, qualified voice conversations, summaries and next actions.

## V0.1 implemented

- Command Center UI
- EN/RU mission planning
- OpenAI Responses API structured planner
- AUTO / APPROVE / BLOCKED execution modes
- Policy gate before provider side effects
- Gmail send + inbox-reader foundation
- X post adapter
- LinkedIn Posts API adapter for approved access
- Instagram Professional image publishing adapter
- Twilio outbound-call adapter
- OpenAI Realtime voice gateway
- Post-call summarizer
- 24/7 worker endpoint foundation
- Supabase model for products, missions, leads, actions, conversations, content, channel accounts and compliance
- RLS / authenticated-only Data API grants

## Stack

Next.js 16 · React 19 · TypeScript · Supabase · OpenAI · Twilio · official channel APIs.

## Run

```bash
cp .env.example .env.local
npm install
npm run typecheck
npm run dev
```

Create a dedicated Supabase project and apply `supabase/migrations/001_core.sql`.

Voice runs separately:

```bash
cd voice-gateway
npm install
npm start
```

See `docs/ARCHITECTURE.md` for the execution model and production gates.
