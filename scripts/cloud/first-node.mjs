#!/usr/bin/env node
/**
 * Markarian Cloud First Node Gate: operator-run read-only Coolify and pilot verification.
 * No mutations, restarts, deployments, secret logging, or automatic production cutover.
 */
import {lstatSync, readFileSync} from 'node:fs';
import {isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';

export const PILOT_MARKER = 'markarian-cloud-pilot:v1:disposable';
const TOKEN_RE = /^[a-zA-Z0-9_.|:-]{16,512}$/;
const SERVER_ID = /^[a-zA-Z0-9_-]{8,128}$/;
const RESULT = Object.freeze({PASS:'PASS', WAIT:'WAIT', FAIL:'FAIL'});
const make = (id,status,detail) => ({id,status,detail});

export function trustedHttpsOrigin(raw) {
  if (typeof raw !== 'string' || !raw || /[\s\\]/.test(raw)) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' || u.pathname !== '/' || u.username || u.password || u.search || u.hash) return null;
    if (!u.hostname || u.hostname.endsWith('.') || u.hostname === 'localhost') return null;
    return u.origin;
  } catch { return null; }
}

export function readPrivateReadToken(filename) {
  if (!filename || !isAbsolute(filename)) throw Error('CLOUD_COOLIFY_READ_TOKEN_FILE must be an absolute path');
  const stat = lstatSync(filename); // Never follow symlinked credentials.
  if (!stat.isFile() || (stat.mode & 0o077) !== 0) throw Error('Read token must be a private regular file (mode 0600)');
  if (typeof process.getuid === 'function' && stat.uid !== process.getuid()) throw Error('Read token must be owned by the current user');
  const token = readFileSync(filename,'utf8').trim();
  if (!TOKEN_RE.test(token)) throw Error('Read token format is invalid');
  return token;
}

function resultServers(body,target) {
  if (!Array.isArray(body)) return make('coolify-server',RESULT.FAIL,'Unexpected server inventory format');
  const matched=body.filter(x=>x && typeof x === 'object' && x.uuid === target);
  if (matched.length !== 1) return make('coolify-server',RESULT.WAIT,'Configured target server UUID not found uniquely in Coolify inventory');
  const status=matched[0].settings;
  if (status?.is_reachable === true && status?.is_usable === true)
    return make('coolify-server',RESULT.PASS,'Selected target server reported reachable and usable by Coolify');
  if (status?.is_reachable === false || status?.is_usable === false)
    return make('coolify-server',RESULT.FAIL,'Selected target server reported unreachable or unusable');
  return make('coolify-server',RESULT.WAIT,'Selected server status lacks reachable/usable fields');
}

async function checkedJSON(fetcher,url,token) {
  const response = await fetcher(url,{method:'GET',headers:{Authorization:`Bearer ${token}`,Accept:'application/json'},
    cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
  if (!response.ok) throw Error(`HTTP ${response.status}`);
  return response.json();
}

export async function verifyFirstNode(env=process.env,fetcher=fetch) {
  const checks = [];
  const add = (id,status,detail)=>checks.push(make(id,status,detail));
  const base = trustedHttpsOrigin(env.CLOUD_COOLIFY_URL);
  const pilot = trustedHttpsOrigin(env.CLOUD_PILOT_URL);
  const target = SERVER_ID.test(env.CLOUD_TARGET_SERVER_UUID||'') ? env.CLOUD_TARGET_SERVER_UUID : null;
  const nodeOk = Number(process.versions.node.split('.')[0]) >= 22;
  add('node-runtime',nodeOk?RESULT.PASS:RESULT.FAIL,nodeOk?'Node.js >=22':'Node.js >=22 is required');
  add('coolify-url',base?RESULT.PASS:RESULT.WAIT,base?'Trusted HTTPS Coolify origin configured':'Configure CLOUD_COOLIFY_URL with an HTTPS origin');
  add('pilot-url',pilot?RESULT.PASS:RESULT.WAIT,pilot?'Trusted HTTPS pilot origin configured':'Configure CLOUD_PILOT_URL after a disposable pilot is deployed');
  add('target-server',target?RESULT.PASS:RESULT.WAIT,target?'Explicit Coolify target server selected':'Configure CLOUD_TARGET_SERVER_UUID to prevent verifying the wrong server');
  let token;
  try { token = readPrivateReadToken(env.CLOUD_COOLIFY_READ_TOKEN_FILE); add('coolify-read-token',RESULT.PASS,'Owner-held private read-only token file available'); }
  catch { add('coolify-read-token',RESULT.WAIT,'Provide an owned 0600 CLOUD_COOLIFY_READ_TOKEN_FILE; no token details are logged'); }

  if (base && token && target) {
    try { checks.push(resultServers(await checkedJSON(fetcher,new URL('/api/v1/servers',base),token),target)); }
    catch { add('coolify-server',RESULT.FAIL,'Could not securely read Coolify servers (network, permissions, response, or TLS)'); }
  } else add('coolify-server',RESULT.WAIT,'Server inventory requires Coolify URL, target server UUID and private read token');

  // No Authorization header is sent to the public pilot. The marker distinguishes our test from an arbitrary HTTP 200.
  if (pilot) {
    try {
      const response=await fetcher(pilot,{method:'GET',headers:{Accept:'text/html'},cache:'no-store',
        redirect:'error',signal:AbortSignal.timeout(8000)});
      const declaredLength=Number(response.headers.get('content-length'));
      if (!response.ok || (Number.isFinite(declaredLength) && declaredLength > 65536))
        throw Error('Unacceptable pilot response');
      const contentType=response.headers.get('content-type')||'';
      if (!contentType.toLowerCase().includes('text/html')) throw Error('Unexpected content type');
      // Bound what we read even if the server omits Content-Length.
      const reader=response.body?.getReader();
      if (!reader) throw Error('Missing response stream');
      let bytes=0, html='';
      const decoder=new TextDecoder();
      try {
        while (true) {
          const {done,value}=await reader.read();
          if(done) break;
          bytes += value.length;
          if(bytes > 65536) throw Error('Pilot response exceeded size limit');
          html += decoder.decode(value,{stream:true});
        }
        html += decoder.decode();
      } finally { reader.releaseLock(); }
      if(!html.includes(PILOT_MARKER)) throw Error('Missing pilot identity marker');
      add('pilot-response',RESULT.PASS,'HTTPS served the expected disposable Markarian pilot marker');
    } catch {
      add('pilot-response',RESULT.FAIL,'Pilot could not be verified by HTTPS and expected identity marker');
    }
  } else add('pilot-response',RESULT.WAIT,'No pilot verification attempted until HTTPS pilot origin is configured');

  const passed=checks.every(c=>c.status===RESULT.PASS);
  return {schema:'markarian-first-node/v1',gate:passed?'STAGING_PILOT_VERIFIED':'NOT_READY',
    // Deliberately no timestamps, URLs, tokens, upstream bodies or resource names.
    checks,productionReady:false,canMigrateProduction:false};
}

const INSTRUCTIONS = [
  'First node readiness: no deploys or production changes.',
  '1. Install and secure Coolify on an owned VPS; set up TLS and read-only API access.',
  '2. Deploy deploy/cloud/pilot/compose.yaml as a disposable HTTPS service.',
  '3. Store a read-only Coolify token in an owner-held 0600 regular file.',
  '4. Set CLOUD_COOLIFY_URL, CLOUD_PILOT_URL, CLOUD_TARGET_SERVER_UUID and CLOUD_COOLIFY_READ_TOKEN_FILE.',
  '5. Execute: node scripts/cloud/first-node.mjs --verify --json',
  'A successful gate verifies only the first staging pilot; it does NOT authorize production migration.'
].join('\n');

export async function main(args=process.argv.slice(2),env=process.env,fetcher=fetch,stdout=process.stdout,stderr=process.stderr) {
  const [command,option,...extra]=args;
  if(extra.length || !['--plan','--verify'].includes(command) || (option && (command!=='--verify' || option!=='--json'))) {
    stderr.write('Usage: node scripts/cloud/first-node.mjs --plan | --verify [--json]\n');
    return 2;
  }
  if(command==='--plan') {stdout.write(INSTRUCTIONS+'\n');return 0;}
  const receipt=await verifyFirstNode(env,fetcher);
  if(option==='--json') stdout.write(JSON.stringify(receipt,null,2)+'\n');
  else {
    for(const c of receipt.checks) stdout.write(`[${c.status}] ${c.id} — ${c.detail}\n`);
    stdout.write(`Gate: ${receipt.gate}. Production migration remains disabled.\n`);
  }
  return receipt.gate==='STAGING_PILOT_VERIFIED'?0:1;
}
if(process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) process.exitCode=await main();