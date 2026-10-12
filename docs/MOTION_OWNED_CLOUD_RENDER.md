# Margaryan Motion Studio — OWN RAILWAY VIDEO RENDER WORKER

This is a real first-party pipeline: public-safe MCP Director creates an editable film plan; **authorized operator** launches a native MP4 render; a **dedicated Railway service** runs our Next Studio + Playwright Chromium + FFmpeg; PostgreSQL holds only job metadata; a **private Railway volume** holds MP4s for seven days. No Higgsfield, no external AI video provider, no third-party API tokens or credit charges from film generators.

## Deployment architecture

```
ChatGPT MCP /api/motion/mcp (READ ONLY, no remote actions)
    ↓ editorial planning
Motion Studio owner /motion/render (DISTRIBUTION BASIC AUTH)
    → POST /api/motion/render-jobs (same-origin, single fixed preset)
    → Existing Railway Postgres / motion_render_jobs table
    → NEW Railway motion-render-worker PRIVATE SERVICE / 1 job at a time
    → Local Next Studio (127.0.0.1:3118) + our render-master.mjs
    → Chromium frames + FFmpeg H264/AAC + original Motion soundtrack
    → Dedicated /data/motion volume / UUID.mp4
    → Authenticated Distribution GET /api/motion/render-jobs/:id/file
      → private Railway GET /file/:id (worker secret, no public worker DNS)
      → MP4 streamed to the owner.
```

## Railway wiring

Project: **Margaryan Distribution**. Environment: production. Existing web: `distribution-web`. Existing Postgres: `Postgres`. **Do not change the VETO services or public MCP allowlist.**

Create a **new** service named `motion-render-worker` using the same GitHub repo and `Dockerfile.motion-worker`. Use a persistent Railway Volume **at `/data/motion`**. Set single region, one replica, max **1 vCPU and 2 GiB RAM** initially; Chromium + FFmpeg may need more RAM in heavy scenes, so monitor OOM errors before raising spend. This service intentionally has **no public domain**; private DNS is `motion-render-worker.railway.internal`.

Worker env:
- `MOTION_RENDER_ENABLED=true`
- `DISTRIBUTION_DATABASE_URL=${{Postgres.DATABASE_URL}}`
- `MOTION_RENDER_OUTPUT_DIR=/data/motion`
- `MOTION_WORKER_INTERNAL_SECRET=<32+ byte random owner-generated secret>`
- `PORT=3009`
- `NODE_ENV=production`

Existing `distribution-web` service needs:
- `MOTION_RENDER_ENABLED=true`
- `MOTION_WORKER_INTERNAL_URL=http://motion-render-worker.railway.internal:3009`
- `MOTION_WORKER_INTERNAL_SECRET=<exact same secret>`

Check Railway deployment `SUCCESS` on worker and GET `/healthz` via private network, then visit **`https://distribution-web-production.up.railway.app/motion/render`**. This screen is protected by existing operator Basic Auth. Vercel's separate protected origin is not the canonical cloud-render UI.

## Safety and billing

- The original fixed 36.5-second Promptence editorial cut only; no arbitrary project JSON, paths, URLs, website scrapers, private scans or client media are accepted by the job API. This deliberately keeps the first deployment safe.
- **1 concurrent render**, **3 jobs per rolling 24 hours**, **11-minute render timeout**, **120 MB MP4 hard output ceiling**, automatic deletion after 7 days. The owner remains responsible for Railway compute/volume charges; budgets are not equivalent to a spend guarantee.
- MP4 is a **review draft**, never a certified ad. Commercial approval and voice/music/source review are not waived. The first cloud preset uses the existing original Motion procedural score **without professional spoken narration**.
- No public video URL is minted: worker volume is private and the owner Basic-authenticated Distribution app streams it using an internal service-to-service secret.
- Worker container receives ONLY a dedicated Postgres connection and its own internal secret, **not** production Distribution CRM credentials, OPENAI_API_KEY, Gmail, Twilio or social tokens.
- Worker auto-refuses unsupported presets; remote MCP is still read-only. A direct *ChatGPT write → queue* integration would require proper owner OAuth/ChatGPT app permissions, not opening unauthenticated execution endpoints.

## Testing

```bash
npm run motion:test-owned-worker
npm run typecheck
npm run build

# Operator login on Railway web:
# 1. Visit /motion/render and click Create MP4.
# 2. Check status RUNNING then COMPLETE; download via Basic-gated /file route.
# 3. Confirm /api/leads and /operations still return 401 without owner Basic auth.
# 4. Confirm worker has no public domain and volume is attached at /data/motion.
```

For voice, real UI capture and fully managed custom scripts, continue using the existing owner-approved local Motion workflow until the private editor-to-queue job format and voice/licensing checks are implemented. This worker is **an owned execution foundation**, not proof that automatic ad generation has reached agency quality.
