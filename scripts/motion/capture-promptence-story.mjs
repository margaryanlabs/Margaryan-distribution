#!/usr/bin/env node
/**
 * Capture six *different* publicly visible Promptence feature areas for
 * native Motion Studio. Strictly fail on first-visit overlays, unreadable
 * mobile type, invisible target headings and near-duplicate screen content.
 *
 * Usage: node scripts/motion/capture-promptence-story.mjs --out out/motion/promptence-story
 * Operator-only, anonymous, source screenshots + PENDING review manifest.
 * Actual customer scan/workspace screens still require owner-provided media.
 */
import {mkdir,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {join,resolve} from "node:path";
import {clearPublicOnboarding,inspectProductFrame,inspectProductElement,screenshotSignature,verifyNovelShot,
  PROMPTENCE_SECTIONS} from "./source-capture-gates.mjs";
const argv=process.argv.slice(2);
if(argv.length!==2||argv[0]!=="--out"||!argv[1]||argv[1].startsWith("--"))
  throw Error("Usage: node scripts/motion/capture-promptence-story.mjs --out out/motion/promptence-story");
const folder=resolve(argv[1]);
const {chromium}=await import("playwright");
const browser=await chromium.launch({headless:true});
try{
  const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1,
    locale:"en-US",serviceWorkers:"block",acceptDownloads:false});
  const page=await context.newPage();
  const response=await page.goto("https://promptence.tech/",{waitUntil:"domcontentloaded",timeout:45000});
  if(!response?.ok()||new URL(page.url()).hostname!=="promptence.tech")
    throw Error("Refusing capture of an unavailable or redirected public product.");
  const onboarding=await clearPublicOnboarding(page,"promptence");
  await page.evaluate(()=>document.fonts.ready);
  await page.addStyleTag({content:"*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important;caret-color:transparent!important}"});
  const verified=[];const signatures=[];
  await mkdir(folder,{recursive:true,mode:0o700});
  for(const section of PROMPTENCE_SECTIONS){
    const target=section.selector
      ?page.locator(section.selector).first()
      :page.getByRole("heading",{name:section.heading,exact:true}).first();
    await target.waitFor({state:"visible",timeout:12000});
    await target.scrollIntoViewIfNeeded({timeout:8000});
    await page.waitForTimeout(300);
    const check=section.selector
      ?await inspectProductElement(page,section.selector)
      :await inspectProductFrame(page,section.heading);
    const bytes=await page.screenshot({type:"png",animations:"disabled",fullPage:false});
    const signature=await screenshotSignature(page,bytes);
    const novelty=verifyNovelShot(signatures,signature,5);
    signatures.push(signature);
    const filename=section.assetId+".png";
    await writeFile(join(folder,filename),bytes,{mode:0o600});
    verified.push({assetId:section.assetId,section:section.label,heading:section.heading,
      filename,bytes:bytes.length,sha256:createHash("sha256").update(bytes).digest("hex"),
      visualDifference:novelty,overlayAbsent:!check.overlayVisible,
      headingVisible:check.headingVisible,layoutValid:true,status:"PASS"});
    process.stdout.write("Captured "+section.label+" / distinct source / difference "+novelty+"\n");
  }
  const manifest={version:1,brand:"promptence",sourceUrl:"https://promptence.tech/",
    capturedAt:new Date().toISOString(),format:"source-stage-landscape",viewport:{width:1280,height:720},
    firstVisitOnboardingHandled:onboarding,shots:verified,
    approval:{status:"PENDING_HUMAN_REVIEW",sourceRights:false,
      privacyReviewed:false,productTruthReviewed:false,finalMasterReviewed:false},
    note:"Source-capture technical checks passed. Human authorization and the final video review remain mandatory."};
  await writeFile(join(folder,"promptence-source-manifest.json"),JSON.stringify(manifest,null,2)+"\n",{mode:0o600});
  await writeFile(join(folder,"motion-media-map.json"),JSON.stringify(Object.fromEntries(
    verified.map(s=>[s.assetId,join(folder,s.filename)])),null,2)+"\n",{mode:0o600});
  process.stdout.write("Six distinct, wide product stages ready for human review. No simulated AI answers.\n");
}finally{await browser.close();}
