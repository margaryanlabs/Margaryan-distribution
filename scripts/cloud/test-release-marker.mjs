import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stagingReleaseMarker} from '../../lib/cloud/release-marker.ts';
const env={CLOUD_STAGING_MARKER_ENABLED:'staging-only',CLOUD_STAGE_ENVIRONMENT:'staging',
 CLOUD_STAGE_PROJECT:'margaryan-cloud',CLOUD_STAGE_REPOSITORY:'margaryanlabs/Margaryan-distribution',
 CLOUD_STAGE_COMMIT_SHA:'a'.repeat(40)};
test('staging marker is disabled without explicit independent environment values',()=>{
 assert.equal(stagingReleaseMarker({}),null);
 for(const key of Object.keys(env)){
  const modified={...env};delete modified[key];
  assert.equal(stagingReleaseMarker(modified),null,'missing '+key);
 }
});
test('correct Cloud staging identity returns only SHA + public source marker',()=>{
 const marker=stagingReleaseMarker(env);
 assert.deepEqual(marker,{schema:'markarian-staging-release/v1',environment:'staging',
  project:'margaryan-cloud',repository:'margaryanlabs/Margaryan-distribution',commit:'a'.repeat(40)});
 assert.doesNotMatch(JSON.stringify(marker),/PASSWORD|TOKEN|SECRET/);
});
test('refuses arbitrary repos, production mode, branch strings, and forged feature switches',()=>{
 for(const [key,value] of [
  ['CLOUD_STAGE_ENVIRONMENT','production'],['CLOUD_STAGING_MARKER_ENABLED','true'],
  ['CLOUD_STAGE_PROJECT','decision-command'],['CLOUD_STAGE_REPOSITORY','evil/repo'],
  ['CLOUD_STAGE_COMMIT_SHA','main'],['CLOUD_STAGE_COMMIT_SHA','b'.repeat(39)]])
   assert.equal(stagingReleaseMarker({...env,[key]:value}),null,key);
});
test('public marker route is GET-only, no-store and cannot expose secrets on failed config',()=>{
 const route=readFileSync(new URL('../../app/.well-known/markarian-release.json/route.ts',import.meta.url),'utf8');
 assert.match(route,/stagingReleaseMarker\(process\.env\)/);
 assert.match(route,/Cache-Control/);
 assert.match(route,/404/);
 assert.doesNotMatch(route,/export async function (POST|PUT|PATCH|DELETE)/);
});
