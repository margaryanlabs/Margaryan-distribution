# Margaryan Motion Studio — Commercial film service / 2026-10-11

## Launch surfaces
- **Customer-facing film briefing:** `/motion/commission`, responsive EN/RU with three
  transparent **custom-quote** offers: Launch Film 15–30s, Product Story 45–90s,
  Feature Film 2–5m.
- **Studio director:** `/motion?mode=cinematic`, links into the commercial brief.
- No fabricated agency case studies, sales, conversion figures, client results or
  online payments. Commercial packages are **scope examples**, not confirmed prices.

## What works without accounts, AI credits or servers
Prospective clients can pick an output aspect ratio, select an offer, describe
their audience, goal, timing and original materials, then **copy** or
**download** a professionally structured text brief locally. This is useful
for a sales call or founder-led outreach and does not send the enquiry or
claim a completed order.

## How to enable genuine online enquiries
The public intake is **fail-closed**. `GET /api/motion/commission` returns
`accepting:false` until *all* of the following Vercel environment variables
are configured. Existing prompts, other sales missions, CRM data and
auth credentials are not exposed to site visitors:

| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | Permitted transactional email provider |
| `MOTION_SALES_SENDER` | Verified sender email at your sending domain |
| `MOTION_SALES_INBOX` | Private email address to receive production requests |
| `TURNSTILE_SECRET_KEY` | Cloudflare challenge **server-only** verification |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Publishable site key restricted to the project domain |

Never expose provider keys or service role tokens through `NEXT_PUBLIC_*`.
Add the production domain to Turnstile's permitted hostnames.
Deploy/redeploy after adding environment variables.

The form obtains a Cloudflare Turnstile token. On POST the server:
1. Checks status/config, same-origin and body <=9KB.
2. Rejects invalid offer, format, contact details or absent consent.
3. Verifies challenge token with Cloudflare's server endpoint, including
   hostname and action `motion_inquiry`.
4. Sends only the approved brief through Resend with sender/inbox configured
   on the server and `reply_to` set to the customer's address.
5. Returns **provider-accepted** (not "delivered", "paid" or "booked").
6. Does not store client PII or invoke AI/API model inference.

If any integration is missing or the provider fails, the UI explicitly
stays in **LOCAL BRIEF MODE**. No fake success toast, phantom CRM lead or
unverified marketing email.

### Owner acceptance test after configuration
- Visit `/motion/commission` on the production custom domain (not a
  stale protected preview).
- Confirm availability badge is **ENQUIRIES ENABLED**.
- Complete Turnstile and submit **one owner-generated test enquiry**.
- Confirm actual mail arrival in the configured inbox and a successful
  reply-to address; check spam and Resend request status if necessary.
- Without configuration, verify HTTP 503 and local draft copy/download
  instead of falsely recording a lead.
- Verify client cannot access operator CRM `/sales` or private `/api/leads`
  without current operator credentials.
- Verify mobile/iOS/Android viewport, text hierarchy and form keyboard.
- Do not activate paid checkout or "book a call" until real
  payment/availability systems are configured.

## Scope & creative quality
This is an **actual commercial sales funnel shell**, but it does not
manufacture a verified client case study or finished Promptence MP4. The
existing Motion Studio still needs approved product footage, real human
voice and finished-film visual/audio review before distributing a commercial.

### Tests
`npm run motion:test-commission` validates input constraints,
consent separation (local draft vs provider POST), transparent offer catalogue,
the exact public API proxy exception, and mandatory provider/Turnstile gates.
This check also runs before Next.js production builds.
