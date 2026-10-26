# Markarian Cloud — total cost visibility, without fixed architecture ceilings

Status: **optional cost-planning tool only**, not a fixed $50 ceiling, not an architecture approval mechanism. No provider billing integration, purchased VPS, managed production database or production cutover. Last reference check: 2026-10-26. These are **USD vendor-listed figures, not invoice guarantees**. Prices vary by location, account currency, VAT and available hardware.

## Reference comparison: official Hetzner prices (Germany / Finland, effective 2026-06-15)

- CX43: **$18.49/month**, 8 shared vCPU, 16 GiB RAM, 160 GB SSD.
- CX53: **$34.99/month**, 16 shared vCPU, 32 GiB RAM, 320 GB SSD.
- Primary IPv4: **$0.60/month**.
- Hetzner Object Storage: approx. **$7.99/month** current base cost (independent billable product, charged while any bucket exists). Confirm the checkout quote before purchase.
- Cloud server backup option: commonly 20% additional server price, **not** a substitute for independent encrypted database/object-store backup and isolated restore.
- Self-hosted Coolify license **$0**; compute, backups, operators, email and domains are not included.

Sources (operator MUST recheck):
- https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/
- https://docs.hetzner.com/general/infrastructure-and-availability/ipv4-pricing/
- https://docs.hetzner.com/cloud/billing/faq/
- https://docs.hetzner.com/storage/object-storage/overview/
- https://coolify.io/docs/core/selfhosted-cloud-comparison

## Historical small-host example (NOT a platform limit)

| Component | 32 GiB VPS |
| --- | ---: |
| CX53 | $34.99 |
| IPv4 | $0.60 |
| Separate Object Storage | $7.99 |
| Total before VAT / extra traffic / snapshots | **$43.58** |
| Planning reserve $5 | **$48.58** |
| Optional VPS backup 20% of VPS rate | +$7.00 = **$55.58** |

**$50 is not a hard bill cap.** Hetzner's Usage Alerts are notifications, not spending limits. Traffic overage is billed even after usage notifications. Alerts can arrive late. The $48.58 pre-tax hosting scenario excludes AI APIs, email, domains, operator maintenance, some backup retention and variable usage. VAT or overages alone may cross $50.

The 16 GiB CX43 is cheaper but **our explicit dual-product estimates do not fit** on 16 GiB alongside separate Neon-compatible Postgres, full Promptence Supabase, Coolify and observability. The 32 GiB model only fits under hypothetical staging allocations; do not call this measured runtime capacity.

## Optional quote evaluation (not a deployment blocker)

From a trusted checkout with Node 22+:

```sh
node scripts/cloud/budget-gate.mjs --example
node --test scripts/cloud/budget-gate.test.mjs
node scripts/cloud/budget-gate.mjs --assess /absolute/private/quote.json
```

Input file must be owner-only 0600, regular (not a symlink), <=16KB. All cost amounts are **decimal USD strings**, not floats, to avoid rounding errors. Set the real current `quoteCheckedAt`, `tax`, `meteredWorstCase`, `reserve` and `maxPerMonth` after checking exact billing settings. `scope` is **hosting-only**; separately record what AI/email/domain/support charges were excluded.

The `--example` input deliberately models a $50 illustrative scenario and reports `BLOCKED` for **that chosen quote** when tax, traffic or provider limits are unknown. **It is not a restriction imposed on Markarian Cloud**: a user may use a different cap or skip this optional quote analysis entirely. Fleet sizing, HA decisions and customer safety are independent of the example amount.

Budget verdicts:
- `BLOCKED` exit 1: over cap, stale quote (>14 days), cost omission, or unverified metered controls.
- `HOSTING_ESTIMATE_FITS_REVIEW_REQUIRED` exit 3: *operator-attested* data under cap, still not a charge limit or authority to purchase/deploy/migrate.
- Invalid input exit 1 or 2; no command ever connects to Hetzner, launches containers, purchases servers, edits DNS or authorizes production.

### Real operational guardrails (must configure with the provider)

1. Build the number of independent application and database nodes demanded by measured capacity and availability objectives. Do not create paid infrastructure without operator-approved provider access; use a reviewed autoscaler once provider cost visibility and rollback are configured.
2. Turn on provider **cost alerts** at $25, $35, $45; these are warnings, not a hard cap. Restrict who can create extra servers or Storage resources.
3. Limit AI spend at the **AI provider** (dedicated keys + hard usage limits where available) and in each product's DB-backed rate controls; never trust a UI-only toggle.
4. Configure outgoing bandwidth/egress observability and backups growth checks. Confirm whether an actual provider-imposed hard limit exists; do not attest it if it does not.
5. Keep backups in a separate failure domain. Storage owned by the same Hetzner account may still be affected by account-wide suspension; maintain an export/recovery plan.
6. Check bill and usage weekly. On budget pressure reduce nonessential workloads, free scans, previews and observability retention first — **never silently delete customer data or skip recoverable backups**.
7. Scale horizontally across truly independent fault domains for high availability, or vertically when simpler. Measure RAM/CPU/IO and recurring charges; do not assume a second VPS produces database failover by itself.

## Application-specific cost traps

- VETOGRAM: Telegram media backups, archive retention, AI usage, bursty MTProto sessions, outbound Telegram Bot API limits, Neon schema v6 migration and key custody.
- Promptence: LLM calls, website crawling, provider API limits, four background schedules, SMTP, OAuth, client data and real payment provider fees.
- Heavy Motion Studio rendering, VETO ClickHouse and experimental AI agents are **excluded from this two-product budget** and default disabled.

## Total cost vs managed-cloud comparison

Compare like with like. A managed Vercel/Railway/Supabase bill may already include backups, S3, SSL, monitoring, authentication, and less operator effort; switching to one VPS saves platform charges but transfers responsibility. An untested $40 server is **not** a fair replacement for a managed, multi-zone, backed-up service. Pay for reliability first, and compare total operational cost and incident risk, not only the server invoice.

## No artificial product limits

Markarian Cloud is not architecturally bound to any specific VPS, vendor or monthly spend. The review-only Fleet Planner at `scripts/cloud/fleet-plan.mjs` supports multiple nodes and actual per-service placement across zones. A budget review is an accounting advisory, not an infrastructure hard stop or runtime throttle. Security (secret isolation, private database networking), observed recovery drills and explicit authorization for real purchases remain necessary regardless of cost.
