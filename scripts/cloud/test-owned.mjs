import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {ownedSignals,ownedLayers} from "../../lib/cloud/owned-infrastructure.ts";
const empty={
 mode:"setup",updatedAt:"",applications:[],servers:[],deployments:[],projects:[],
 errors:[],sources:{applications:false,servers:false,deployments:false,projects:false}
};
test("Unconfigured platform has no invented server or app counts",()=>{
 const result=ownedSignals(empty);
 assert.equal(result.serverCount,null);
 assert.equal(result.applicationCount,null);
 assert.equal(result.healthyServers,null);
 assert.equal(result.readyForMigration,false);
 assert.equal(result.stage,"Not connected");
});
test("Partial inventory success is not represented as full hosting readiness",()=>{
 const data={...empty,mode:"degraded",sources:{applications:true,servers:false,deployments:false,projects:false},
  applications:[{uuid:"a",name:"test",status:"running",domain:"",gitRepository:"",gitBranch:"",updatedAt:""}]};
 const result=ownedSignals(data);
 assert.equal(result.serverCount,null);
 assert.equal(result.applicationCount,1);
 assert.equal(result.readyForMigration,false);
 assert.equal(result.stage,"Partially connected");
});
test("Actual server reachability comes from status, never assumed from counts",()=>{
 const data={...empty,mode:"connected",sources:{applications:true,servers:true,deployments:true,projects:true},
  servers:[{uuid:"s1",status:"unknown",name:"one",ip:"",description:""},
   {uuid:"s2",status:"healthy",name:"two",ip:"",description:""}]};
 const result=ownedSignals(data);
 assert.equal(result.serverCount,2);
 assert.equal(result.healthyServers,1);
 assert.equal(result.readyForMigration,false);
});
test("Self-owned modules are documented without misrepresenting them as running",()=>{
 assert.equal(ownedLayers.length,7);
 assert.equal(ownedLayers.some(x=>x.id==="data"&&x.status==="source-ready"),true);
 assert.equal(ownedLayers.some(x=>x.id==="backup"&&x.status==="planned"),true);
 for(const item of ownedLayers){
  assert.ok(item.location);
  assert.ok(item.needs.length>0);
 }
 const ui=readFileSync(new URL("../../app/cloud/owned-infrastructure.tsx",import.meta.url),"utf8");
 assert.match(ui,/SOURCE PREPARED · NOT HOSTED/);
 assert.doesNotMatch(ui,/Production READY|fully migrated/i);
});
