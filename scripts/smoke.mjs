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

// The source-of-truth signature campaign is a deliberately authored film,
// not the ordinary template engine and not invented third-party AI results.
const signatureResponse=await json("/api/motion/signature?lang=en&format=portrait");
assert(signatureResponse.requiresApiKey===false && signatureResponse.creditsUsed===0,"Signature film must be keyless");
assert(signatureResponse.project.signatureFilm==="promptence-answer","Signature identity must survive project serialization");
assert(signatureResponse.project.brand==="promptence","Signature incorrectly assigns the product");
assert(signatureResponse.project.scenes.length===8,"Signature requires eight distinct authored beats");
const filmSeconds=signatureResponse.project.scenes.reduce((s,c)=>s+c.seconds,0);
assert(filmSeconds>32 && filmSeconds<36,"Signature runtime should be about 34 seconds");
assert(signatureResponse.project.scenes[7].kind==="closer","Signature must hold verified brand outro");
const invalidSignature=await fetch(baseUrl+"/api/motion/signature?lang=invalid&format=portrait");
assert(invalidSignature.status===400,"Unknown signature locale must be rejected");
for(const language of ["ru","hy"]){
 const data=await json("/api/motion/signature?lang="+language+"&format=portrait");
 const script=language==="hy"?/[\u0531-\u058f]/u:/[\u0400-\u04ff]/u;
 assert(data.project.scenes.some(s=>script.test(s.headline)),"Signature language missing: "+language);
}
// Motion Studio must produce an editable, meaningful scene plan without any AI credentials.
const motionPage = await fetch(baseUrl + "/motion");
assert(motionPage.ok, "Motion Studio page did not render");
const originalMark = await fetch(baseUrl + "/motion/brands/promptence.svg");
assert(originalMark.ok && (await originalMark.text()).includes("<svg"), "Original Promptence mark is not accessible from public Motion Studio");
const invalid = await fetch(baseUrl + "/api/motion/storyboard", {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ prompt: "hi", brand: "veto", format: "portrait" }),
});
assert(invalid.status === 400, "Keyless director accepted a too-short brief");
const story = await json("/api/motion/storyboard", {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({
    prompt: "Создай кинематографическую рекламу криптотрейдинга без обещаний доходности",
    brand: "veto", format: "portrait", language: "ru", style: "cinematic",
  }),
});
assert(story.engine === "keyless-procedural-v2", "Motion must use its own keyless engine");
assert(story.requiresApiKey === false && story.creditsUsed === 0, "Motion cannot require paid models");
assert(story.project?.scenes?.length >= 4, "Motion needs a multi-scene storyboard");
assert(story.project.scenes.some((scene) => /[\u0400-\u04ff]/.test(scene.headline)), "Russian brief did not produce Cyrillic storytelling");
const storyAgain = await json("/api/motion/storyboard", {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({
    prompt: "Создай кинематографическую рекламу криптотрейдинга без обещаний доходности",
    brand: "veto", format: "portrait", language: "ru", style: "cinematic",
  }),
});
assert(JSON.stringify(story.project) === JSON.stringify(storyAgain.project), "Local storyboarding should be deterministic");
const storyOther = await json("/api/motion/storyboard", {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({
    prompt: "Show a restaurant technology that helps owners understand margins and operations",
    brand: "raios", format: "landscape", language: "en", style: "technical",
  }),
});
assert(storyOther.project.title !== story.project.title, "Different briefs should produce different motion stories");
const armenianFilm = await json("/api/motion/storyboard", {
  method:"POST",headers:{"content-type":"application/json"},
  body:JSON.stringify({
    prompt:"Ստեղծիր նորաձևության կինեմատոգրաֆիկ տեսանյութ INGU ապրանքանիշի համար։",
    brand:"ingu",format:"portrait",language:"hy",style:"kinetic"
  })
});
assert(armenianFilm.project?.brand==="ingu", "Portfolio brand not retained by local director");
assert(armenianFilm.project?.language==="hy", "Armenian locale was not saved in the project");
assert(armenianFilm.project.scenes.some(scene => /[\u0531-\u058f]/u.test(scene.headline)), "Armenian output is missing Armenian text");
const privateFilm = await json("/api/motion/storyboard", {
  method:"POST",headers:{"content-type":"application/json"},
  body:JSON.stringify({
    prompt:"Создай короткий видеоролик о настройках конфиденциальности VETO Private",
    brand:"veto_private",format:"square",language:"ru",style:"technical"
  })
});
assert(privateFilm.project?.brand==="veto_private", "Extended brand catalog mismatch");
assert(privateFilm.project.scenes.length>=4, "Extended portfolio lacks an actual storyboard");
const newMarks=["/motion/brands/hay-engine.svg","/motion/brands/tun-component-preview.svg"];
for (const markPath of newMarks) {
  const mark=await fetch(baseUrl+markPath);
  assert(mark.ok && (await mark.text()).includes("<svg"),"New verified/component-based brand visual could not load: "+markPath);
}
for(const spec of [
  {brand:"tun",language:"ru",prompt:"Сделай рекламу TUN, где личная цель важнее списка недвижимости",script:/[\u0400-\u04ff]/u},
  {brand:"hay_engine",language:"hy",prompt:"Ստեղծիր HAY Engine տեսանյութ հայերեն տեքստով",script:/[\u0531-\u058f]/u},
  {brand:"reality_engine",language:"en",prompt:"Show scenario risk and decision simulations in Reality Engine",script:/[A-Za-z]/}
]){
  const film=await json("/api/motion/storyboard",{
    method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({prompt:spec.prompt,brand:spec.brand,format:"portrait",language:spec.language,style:"cinematic"})
  });
  assert(film.project.brand===spec.brand,"Motion portfolio ID missing: "+spec.brand);
  assert(film.project.language===spec.language,"Motion storyboard locale missing for "+spec.brand);
  assert(film.project.scenes.some(scene=>spec.script.test(scene.headline)),"No supported script for "+spec.brand);
  assert(film.project.scenes.length>=5,"Not enough product storytelling for "+spec.brand);
}



const timedFilm=await json("/api/motion/storyboard",{
  method:"POST",headers:{"content-type":"application/json"},
  body:JSON.stringify({
    prompt:"Create a 22 seconds cinematic film for TUN about goal-first real estate decisions",
    brand:"tun",format:"portrait",language:"en",style:"cinematic"
  })
});
const timedTotal=timedFilm.project.scenes.reduce((n,scene)=>n+scene.seconds,0);
assert(Math.abs(timedTotal-22)<0.05,"Natural-language 22-second brief was not honored");
const captionBundle=await json("/api/motion/captions",{
  method:"POST",headers:{"content-type":"application/json"},
  body:JSON.stringify({project:armenianFilm.project})
});
assert(captionBundle.alignedToVoice===false,"Editorial shot cues must never pretend to align speech");
assert(captionBundle.cues.length===armenianFilm.project.scenes.length,"Subtitles lost scene timing");
assert(captionBundle.srt.includes("-->") && /[\u0531-\u058f]/u.test(captionBundle.srt) ,"Armenian SRT missing timecodes/glyphs");
assert(captionBundle.vtt.startsWith("WEBVTT"),"WebVTT format invalid");
assert(captionBundle.voiceScript.includes("NOT word-level"),"Voice script missing narration safety note");
const malformedCaptions=await fetch(baseUrl+"/api/motion/captions",{
  method:"POST",headers:{"content-type":"application/json"},
  body:JSON.stringify({project:{scenes:[]}})
});
assert(malformedCaptions.status===400,"Caption API accepted malformed project");

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
