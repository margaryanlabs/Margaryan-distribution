import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const workflow=readFileSync(new URL('../../.github/workflows/cloud-stack-ci.yml',import.meta.url),'utf8');
test('stacked Cloud PRs have an explicit read-only verification path',()=>{
 assert.match(workflow,/pull_request:/);
 assert.match(workflow,/'feat\/cloud-\*'/);
 assert.match(workflow,/'feat\/markarian-cloud-\*'/);
 assert.match(workflow,/permissions:\s*\n\s+contents: read/);
});
test('two scoped jobs cover offline Cloud safety and optional full build',()=>{
 for(const name of ['cloud-safety:','web-build:'])assert.ok(workflow.includes(name));
 assert.match(workflow,/npm ci --no-audit --no-fund/);
 assert.match(workflow,/npm run typecheck/);
 assert.match(workflow,/npm run build/);
 assert.match(workflow,/ci-run-gate.test.mjs/);
 assert.match(workflow,/test-cloud-stack-workflow.mjs/);
});
test('no secrets, trading, deploy, or production infrastructure actions in validation steps',()=>{
 assert.doesNotMatch(workflow,/secrets\./);
 assert.doesNotMatch(workflow,/CLOUD_COOLIFY_WRITE_TOKEN|GH_TOKEN|GITHUB_TOKEN:/);
 assert.doesNotMatch(workflow,/\b(?:docker push|kubectl apply|vercel deploy|railway up|terraform apply)\b/);
 assert.match(workflow,/persist-credentials: false/);
 assert.match(workflow,/cancel-in-progress: true/);
});
test('expensive full build is never triggered automatically by stacked PR events',()=>{
 assert.match(workflow,/if: github\.event_name == 'push'/);
 assert.match(workflow,/paths:\s*\n\s+- '\.github\/workflows\/cloud-stack-ci\.yml'/);
});
