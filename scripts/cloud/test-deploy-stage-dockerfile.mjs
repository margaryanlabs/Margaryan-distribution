import { test } from "node:test";
import assert from "node:assert/strict";
import { createStagingRequest } from "./deploy-stage.mjs";

const basic = {
  project_uuid: "project_12345678",
  server_uuid: "server_12345678",
  environment_name: "staging",
  source: "private-github-app",
  github_app_uuid: "github_app_12345678",
  git_repository: "margaryanlabs/decision-command",
  git_branch: "ops/recovery-readiness-20261026",
  build_pack: "dockerfile",
  ports_exposes: "3000",
  name: "veto-recovery-staging",
};

test("nested private VETO Dockerfile is included but staging remains non-deploying", () => {
  const actual = createStagingRequest({...basic, dockerfile_location:"deploy/selfhost/Dockerfile.web"});
  assert.equal(actual.dockerfile_location, "deploy/selfhost/Dockerfile.web");
  assert.equal(actual.instant_deploy, false);
  assert.equal(actual.autogenerate_domain, false);
  assert.equal(actual.is_auto_deploy_enabled, false);
  assert.equal(actual.base_directory, "/");
  assert.equal(actual.limits_memory, "1g");
  assert.equal(actual.limits_cpus, "1");
  assert.equal(actual.environment_name, "staging");
  assert.equal(actual.github_app_uuid, basic.github_app_uuid);
  assert.equal(actual.domains, undefined);
});

test("no application is automatically built on creation or subsequent pushes", () => {
  for (const source of ["private-github-app", undefined]) {
    const c = source === undefined ? {...basic, source:undefined, github_app_uuid:undefined,
      git_repository:"https://github.com/example/public-app"} : basic;
    const req=createStagingRequest(c);
    assert.deepEqual([req.instant_deploy,req.is_auto_deploy_enabled,req.autogenerate_domain],
      [false,false,false]);
    assert.equal(req.base_directory, "/");
  }
});

test("resource caps reject unexpectedly large or unlimited staging containers", () => {
  assert.deepEqual(
    [createStagingRequest({...basic,limits_memory:"2g",limits_cpus:"0.5"}).limits_memory,
      createStagingRequest({...basic,limits_memory:"2g",limits_cpus:"0.5"}).limits_cpus],
    ["2g","0.5"]);
  for (const value of ["0","999g","8g","1g;echo",0,null]) {
    assert.throws(()=>createStagingRequest({...basic,limits_memory:value}), undefined, String(value));
  }
  for (const value of ["0","8","100","1;rm",1,null]) {
    assert.throws(()=>createStagingRequest({...basic,limits_cpus:value}), undefined, String(value));
  }
});

test("nested private PROMPTENCE Dockerfile is supported", () => {
  const actual = createStagingRequest({
    ...basic, git_repository: "margaryan-labs/ai-revenue-navigator",
    dockerfile_location: "deploy/selfhost/Dockerfile",
    name: "promptence-recovery-staging",
  });
  assert.equal(actual.dockerfile_location, "deploy/selfhost/Dockerfile");
});

test("existing staging importer still supports build packs without Dockerfile location", () => {
  const actual = createStagingRequest({...basic, build_pack: "nixpacks"});
  assert.equal(actual.dockerfile_location, undefined);
  assert.equal(actual.instant_deploy, false);
});

test("reject traversal, URL injection, non-Dockerfile names and unsafe characters", () => {
  for(const invalid of [
    "../Dockerfile",
    "deploy/../Dockerfile",
    "deploy/./Dockerfile",
    "./Dockerfile",
    "/Dockerfile",
    "https://example.com/Dockerfile",
    "deploy\\selfhost\\Dockerfile",
    "deploy/selfhost//Dockerfile",
    "deploy/selfhost/Dockerfile%2e",
    "deploy/selfhost/dockerfile",
    "deploy/selfhost/Dockerfile.sh;exit",
    "deploy/selfhost/readme.md",
  ]){
    assert.throws(() => createStagingRequest({...basic, dockerfile_location: invalid}), undefined, invalid);
  }
});

test("Dockerfile paths cannot be sent with other build packs", () => {
  for (const build_pack of ["nixpacks", "railpack", "static"]) {
    assert.throws(() => createStagingRequest({...basic, build_pack, dockerfile_location:"Dockerfile"}));
  }
});

test("invalid paths fail closed, even when passed in a public repo config", () => {
  const publicCfg={...basic,source:undefined,github_app_uuid:undefined,
    git_repository:"https://github.com/example/public-app"};
  assert.throws(()=>createStagingRequest({...publicCfg,dockerfile_location:"a/../../Dockerfile"}));
});
