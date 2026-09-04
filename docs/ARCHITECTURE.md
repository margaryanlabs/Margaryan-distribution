# Architecture

## Core loop

`COMMAND → PLAN → QUEUE → POLICY → APPROVAL → EXECUTE → OBSERVE → SUMMARIZE → LEARN → NEXT ACTION`

The planning model never performs provider side effects directly. It emits typed actions. The policy engine evaluates them. Only an official channel adapter can execute an approved action.

## Layers

1. Command Center — goal, product, market, language, autonomy.
2. Planner — OpenAI Responses API + strict JSON schema.
3. Queue — durable actions with status, schedule, idempotency and retries.
4. Policy/approval — opt-out, DNC, quiet hours, jurisdiction and brand-risk gates.
5. Executors — Gmail, X, LinkedIn Posts, Instagram Professional publishing, Twilio Voice.
6. Voice gateway — Twilio Media Streams ↔ OpenAI Realtime, deployed separately as WebSocket service.
7. Memory — products, missions, leads, content, conversations, summaries and compliance events in Supabase.
8. Analytics — response, engagement, meetings, pipeline and experiments.

## SMM model

A mission creates channel-native variants instead of copying one caption everywhere. Content assets hold a canonical idea plus X, LinkedIn and Instagram variants, media references, schedule and results.

## Messaging

Email is implemented. Social DMs are capability-gated: add them only where the official API and the connected account/app permissions explicitly support the intended messaging flow. We do not use browser automation to bypass platform restrictions.

## Production gates

- Dedicated Supabase project and Auth.
- OAuth connection flows; no long-lived provider tokens in browser storage.
- Webhook signature verification.
- Durable scheduler with idempotency.
- Provider-specific rate limits and retry budgets.
- Unsubscribe / do-not-contact suppression.
- Jurisdiction-aware calling and recording rules.
- Human approval by default for cold outreach and public brand actions until channel policy is explicitly configured.
