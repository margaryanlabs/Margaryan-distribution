# MARKET SPACE Studio · Margaryan Labs

> Experimental, independent B2B merchant configurator for the MARKET SPACE Engine. Not connected to INGU Shop or any customer production systems.

## What the Beta actually does

- Brand name, short subtitle, sector (food / fashion / beauty / furniture), and accent color configuration.
- Edit a fixed **demonstration catalog** of six grocery or four other-sector SKU slots (name, AMD integer price, emoji). CSV or JSON import; JSON export.
- Responsive, immediate product/storefront preview at desktop or mobile frame size (the Studio preview is **CSS 2.5D**, not the actual WebGL scene).
- Local browser draft via `localStorage`. No accounts, database, checkout, camera, or external API.
- Shareable, configured **actual WebGL showroom** via the demo link: `/labs-studio/?world=<sector>&studio=<base64url UTF8 config>`. The 3D scene customizes branding, product labels and prices using client-side validated configuration; it falls back gracefully on devices without WebGL.
- 3D demo's fashion try-on, beauty selection and furniture room tools are stylized simulations, not AR or biometric processing. All merchandise is fictional/test-only.

## Data and security boundaries

- The share URL embeds merchant demo names and SKU prices in plain, reversible base64url **not encryption**. Do not put private catalogs, customer data, secrets, credentials or sensitive business terms into demo links.
- Payload is limited, validated (sector, six-digit CSS color, merchant name, SKU names, integer bounded price, product count), and only rendered as text or canvas textures.
- No imported code, executable 3D assets, HTML images or remote scripts are accepted from users. JSON/CSV imports have a 100 KB file-size limit.
- There is no multi-user persistence: Studio state lives only in the creator's browser.
- The pre-existing Margaryan Labs mall remains available separately at `/labs/`; the configured demo is isolated at `/labs-studio/` during beta.

## Manual acceptance checklist

1. Open `/studio/` and switch between all four sectors.
2. Change brand, slogan, accent, first product and price. Verify the live CSS preview updates immediately.
3. Test the mobile/desktop preview buttons, demo cart button, copy link, JSON export, CSV import and invalid file/error messages.
4. Open **3D world** and verify the configured merchant name, slogan, product label and price in `/labs-studio/` on both desktop and mobile browsers.
5. Confirm the pre-existing `/labs/` demo has not been replaced.

## Tests

- Browser-independent `node --check` succeeded for Studio and storefront JavaScript.
- Isolated Node VM tests verified merchant branding, SKU/price replacement, source atlas texture IDs, tagline/theme application, and rejection of malformed configuration.
- Hosted pages verified reachable by remote fetch.
- **Known QA gap:** in this environment Chromium navigation is policy-blocked (`ERR_BLOCKED_BY_ADMINISTRATOR`), preventing real-device and interactive browser end-to-end QA. Do not mark mobile WebGL/performance QA as complete without separately testing real devices.

## Future product steps

Merchant authentication, tenant database/storage, visual floor-plan creator, managed product imagery and GLB ingestion, inventory/price feeds, checkout integration and consent-based real AR/virtual fitting are **future work**, not included in this beta.
