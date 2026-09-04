# Architecture

## Core loop

`COMMAND → PLAN → QUEUE → POLICY → APPROVAL → EXECUTE → OBSERVE → SUMMARIZE → LEARN → NEXT ACTION`

The planning model never performs provider side effects directly. It emits typed actions. The policy engine evaluates them. Only an official channel adapter can execute an approved action.

## V0.2 runtime

The current product deliberately runs without a database. A typed memory-store adapter keeps missions, actions and content drafts for the life of the Node process. This makes the full product loop testable while the production backend is deferred.

The storage boundary is isolated in `lib/store`. When persistent infrastructure is connected later, the agent, API routes, provider executors and UI should not need to be redesigned; only the storage adapter changes.

## Layers

1. Command Center — goal, product, market, language, autonomy.
2. Planner — OpenAI Responses API + strict JSON schema.
3. Queue — typed actions with status, schedule and retries.
4. Policy/approval — opt-out, DNC, quiet hours, jurisdiction and brand-risk gates.
5. Executors — Gmail, X, LinkedIn Posts, Instagram Professional publishing, Twilio Voice.
6. Voice gateway — Twilio Media Streams ↔ OpenAI Realtime, deployed separately as a WebSocket service.
7. Memory — V0.2 in-process store behind a replaceable interface.
8. Analytics — response, engagement, meetings, pipeline and experiments; persistent analytics arrives with the production store.

## Execution modes

- `AUTO`: the worker may execute when the policy gate passes.
- `APPROVE`: the agent prepares the action and waits for a human approval.
- `BLOCKED`: the configured policy currently forbids execution.

`EXECUTION_ENABLED=false` is the default. In this mode provider executions are simulated and return a dry-run result. This is separate from action approval: the full approval state machine can be tested without external side effects.

## SMM model

One mission can produce channel-native variants rather than copying the same caption everywhere. X, LinkedIn and Instagram receive different drafts while sharing the same campaign thesis and evidence constraints.

## Production backend handoff

When persistent storage is enabled later, it should implement the same store capabilities for missions, actions, content, leads, conversations and analytics. Until then, no production persistence is claimed.
