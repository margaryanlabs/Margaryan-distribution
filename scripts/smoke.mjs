const baseUrl = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function json(path, init) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${init?.method || "GET"} ${path} failed (${response.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

const health = await json("/api/health");
assert(health.ok === true, "health endpoint is not healthy");
assert(health.execution === "dry-run", "CI smoke test must never run with live execution");

const created = await json("/api/missions", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    goal: "CI smoke: verify the distribution agent can accept and execute a governed task",
    market: "Test market",
    language: "en",
    autonomy: "approve",
  }),
});

assert(created.mission?.id, "mission was not created");
assert(Array.isArray(created.actions) && created.actions.length >= 2, "mission did not create an action queue");

const research = created.actions.find((action) => action.kind === "research" && action.mode === "AUTO");
assert(research?.recordId, "fallback plan did not create an AUTO research action");

const worker = await json("/api/worker/tick", { method: "POST" });
assert(worker.processed >= 1, "worker did not process the due AUTO action");
assert(worker.results.some((result) => result.id === research.recordId && result.status === "succeeded"), "internal research action did not succeed");

const approvalTarget = created.actions.find((action) => action.mode === "APPROVE" && action.kind === "publish_post");
assert(approvalTarget?.recordId, "mission did not create an approval-gated publishing action");

await json(`/api/actions/${approvalTarget.recordId}/approve`, { method: "POST" });
const executed = await json(`/api/actions/${approvalTarget.recordId}/execute`, { method: "POST" });
assert(executed.action?.status === "succeeded", "approved provider action did not reach succeeded state");
assert(executed.result?.simulated === true, "provider action was not safely simulated in CI");

const state = await json("/api/state");
const storedResearch = state.actions?.find((action) => action.recordId === research.recordId);
const storedPublish = state.actions?.find((action) => action.recordId === approvalTarget.recordId);
assert(storedResearch?.status === "succeeded", "research result was not reflected in state");
assert(storedPublish?.status === "succeeded", "approved execution result was not reflected in state");
assert(state.missions?.some((mission) => mission.id === created.mission.id), "mission was not visible in state snapshot");

console.log("Distribution smoke test passed: command -> plan -> queue -> internal action -> approval -> dry-run execution -> state.");
