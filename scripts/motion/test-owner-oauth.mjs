#!/usr/bin/env node
/** Invariants for a privileged custom-MCP OAuth flow. Runtime verified separately. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {resolve,dirname} from "node:path";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const read=p=>readFileSync(resolve(root,p),"utf8");
const oauth=read("lib/motion/owner-oauth.ts");
const auth=read("app/api/motion/oauth/authorize/route.ts");
const token=read("app/api/motion/oauth/token/route.ts");
const register=read("app/api/motion/oauth/register/route.ts");
const owner=read("lib/motion/owner-mcp.ts");
const endpoint=read("app/api/motion/mcp/owner/route.ts");
const proxy=read("proxy.ts");
const sharing=read("app/api/motion/share/[id]/route.ts");
const publicMcp=read("lib/motion/native-mcp.ts");
const pubRoute=read("app/api/motion/mcp/route.ts");
for(const value of [
 "code_challenge_method","S256","motion_oauth_codes","motion_oauth_tokens",
 "for update","refresh_token","revoked_at","timingSafeEqual",
 "MOTION_OWNER_OAUTH_SIGNING_SECRET","randomBytes(32)","MOTION_OWNER_RESOURCE",
 "consentCsrfSignature","safeOAuthRedirect","offline_access","motion:render",
 "motion:read"
])assert.ok(oauth.includes(value),"Missing OAuth boundary: "+value);
assert.match(oauth,/expires_at>now\(\)/);
assert.match(oauth,/used_at is null for update/);
assert.match(oauth,/30\*86400/);
assert.match(oauth,/sha256/);
assert.match(oauth,/MAX_CLIENTS=20/);
assert.match(auth,/APPROVE CONNECTION/);
assert.match(auth,/origin/);
assert.match(auth,/SameSite=Lax/);
assert.match(auth,/HttpOnly/);
assert.match(auth,/motion_oauth_nonce/);
assert.match(token,/grant_type/);
assert.match(register,/token_endpoint_auth_method/);
assert.match(endpoint,/verifyMotionOAuthAccess/);
assert.match(endpoint,/motion:render/);
assert.match(endpoint,/insufficient_scope/);
assert.match(endpoint,/WWW-Authenticate/);
assert.match(owner,/motion_owner_render_create/);
assert.match(owner,/queueMotionRender/);
assert.match(owner,/destructiveHint:true/);
assert.match(owner,/acknowledge_railway_compute_charges:z.literal\(true\)/);
assert.match(owner,/motion_owner_download_link/);
assert.match(sharing,/verifyMotionShare/);
assert.match(sharing,/validJobId/);
assert.match(sharing,/railway/);
assert.ok(proxy.includes('path==="/api/motion/oauth/token"'));
assert.ok(proxy.includes('path==="/api/motion/mcp/owner"'));
assert.ok(!proxy.includes('path==="/api/motion/oauth/authorize"'),
 "Operator consent must stay Basic protected");
assert.ok(!proxy.includes('path==="/api/motion/render-jobs"'),
 "Cloud render must stay owner Basic protected");
assert.ok(!publicMcp.includes("motion_owner_render_create"),
 "Unauthenticated MCP must never expose write");
assert.ok(!pubRoute.includes("verifyMotionOAuthAccess"),
 "Leave existing public read-only endpoint working");
console.log("Motion OAuth MCP: PKCE, consent, token rotation, scope, private owner queue and signed MP4 all statically protected.");
