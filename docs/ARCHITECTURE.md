# Margaryan Distribution architecture

## Operating loop

`COMMAND → PRODUCT BRAIN → PLAN → RESEARCH → QUEUE → POLICY → APPROVAL → EXECUTE → OBSERVE → SUMMARIZE → LEARN → NEXT ACTION`

The planning model never performs provider side effects directly. It emits typed actions. The policy engine evaluates them. Only an official channel adapter can execute an approved action.

## V0.4 layers

1. **Command Center** — goal, selected product, market, language, autonomy.
2. **Product Brain** — reusable ICP, pains, proof boundaries, positioning, use cases and objections from supplied notes/public sources.
3. **Planner** — structured OpenAI Responses output using both mission and product context.
4. **Research Agent** — current public-web company research and fit scoring; business-level data only.
5. **Queue** — typed actions with status, schedule and retries.
6. **Policy/approval** — opt-out, DNC, quiet hours, jurisdiction and brand-risk gates.
7. **Executors** — Gmail, X, LinkedIn Posts, Instagram Professional publishing, Twilio Voice.
8. **Voice gateway** — Twilio Media Streams ↔ OpenAI Realtime as a separate WebSocket service.
9. **Memory** — V0.4 process-memory adapter for products, missions, leads, actions and content.
10. **Analytics** — response, engagement, meetings, pipeline and experiments once persistent event storage is attached later.

## No-database boundary

V0.4 intentionally has no database dependency. `lib/store` is the storage boundary. The current implementation is process memory and can reset after restart/cold-start. A persistent adapter can replace it later without changing planner, policy, channel executors or UI contracts.

## SMM model

One mission creates channel-native variants rather than copying one caption everywhere. X, LinkedIn and Instagram share the same campaign thesis and verified product constraints while receiving different copy.

## Messaging

Email execution is adapter-ready. Social messaging remains capability-gated and is added only where official APIs and connected account permissions support the intended flow. Browser automation is not used to bypass platform restrictions.

## Production gates before autonomous scale

- Persistent store adapter.
- OAuth connection flows; no long-lived provider tokens in browser storage.
- Webhook signature verification.
- Durable scheduler with idempotency and retry budgets.
- Provider-specific rate limits.
- Unsubscribe / do-not-contact suppression.
- Jurisdiction-aware calling and recording rules.
- Human approval by default for cold outreach and public brand actions until channel policy is configured.
