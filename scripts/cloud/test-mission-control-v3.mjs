import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../../"+path,import.meta.url),"utf8");
test("Mission Control V3 has four real UI views and click handlers",()=>{
 const src=read("app/cloud/mission-control.tsx");
 for(const value of ['"fleet"','"projects"','"data"','"agents"'])assert.ok(src.includes(value));
 assert.match(src,/onClick=\{\(\)=>setView\(s\.id\)\}/);
 assert.match(src,/aria-pressed=\{watch\}/);
 assert.match(src,/setInterval\(/);
 assert.match(src,/60000/);
});
test("Every Mission Control CSS class used in component exists",()=>{
 const tsx=read("app/cloud/mission-control.tsx");
 const css=read("app/cloud/mission-control.module.css");
 const classes=[...new Set([...tsx.matchAll(/styles\.([A-Za-z][A-Za-z0-9]*)/g)].map(x=>x[1]))];
 assert.ok(classes.length>50);
 for(const c of classes)assert.ok(css.includes("."+c),"CSS class missing: "+c);
});
test("Data, Agent Watch and Projects accessible from root navigation",()=>{
 const page=read("app/cloud/page.tsx");
 for(const name of ['project-center','data-center','agent-watch'])assert.ok(page.includes('"'+name+'"'));
 assert.match(page,/<MissionControl key=\{section\}/);
});
test("Control pane never executes an infrastructure write API",()=>{
 const src=read("app/cloud/mission-control.tsx");
 assert.doesNotMatch(src,/method:\s*["'](?:POST|PUT|DELETE|PATCH)["']/);
 assert.ok(src.includes("/api/cloud/providers"));
 assert.ok(src.includes("/api/cloud/clickhouse"));
});
test("ClickHouse endpoint requires owner auth and exposes GET only",()=>{
 const src=read("app/api/cloud/clickhouse/route.ts");
 const connector=read("lib/cloud/clickhouse.ts");
 assert.ok(src.includes("cloudOperatorAccess(request.headers,process.env)"));
 assert.match(src,/export async function GET/);
 assert.doesNotMatch(src,/export async function (POST|DELETE|PUT|PATCH)/);
 assert.ok(connector.includes('endpoint.searchParams.set("readonly","1")'));
 assert.ok(connector.includes("redirect:\"error\""));
});

test("Portfolio Guardian is presented as source-ready without imaginary live scans",()=>{
 const src=read("app/cloud/mission-control.tsx");
 assert.ok(src.includes('name:"Portfolio Guardian"'));
 assert.ok(src.includes('PORTFOLIO GUARDIAN V1 / SOURCE ONLY'));
 assert.ok(src.includes('prepared, not scheduled'));
 assert.ok(src.includes('node scripts/cloud/portfolio-guardian.mjs --plan'));
 assert.doesNotMatch(src,/fetch\(["']\/api\/cloud\/portfolio/);
});
