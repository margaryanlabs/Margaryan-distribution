#!/usr/bin/env node
/** Browser acceptance test with REAL approved product screenshot.
 * Run local Next Studio and:
 * npm run motion:test-proof -- --screen ./out/approved-candidates/promptence-desktop.png
 * No external network calls, no mock UI, no publication.
 */
import {readFile,writeFile,mkdir,stat} from "node:fs/promises";
import {resolve,dirname,join} from "node:path";
import {spawnSync} from "node:child_process";
const args=process.argv.slice(2);
if(args.length!==2||args[0]!=="--screen")throw Error("Usage: npm run motion:test-proof -- --screen /real/approved/screenshot.png");
const src=resolve(args[1]);
const f=await stat(src);
if(!f.isFile()||f.size>12_000_000)throw Error("Invalid source file");
const root=new URL("http://127.0.0.1:3000/motion/proof");
const {chromium}=await import("playwright");
const folder=resolve("out/proof-browser-review");
await mkdir(folder,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 const response=await page.goto(root.href,{waitUntil:"domcontentloaded",timeout:45000});
 if(!response?.ok())throw Error("Proof director did not respond");
 if(await page.locator("button").filter({hasText:"EXPORT 10s SILENT REVIEW"}).isEnabled())throw Error("Export must be blocked before source upload");
 await page.locator('[data-testid="proof-source-input"]').setInputFiles(src);
 await page.waitForFunction(()=>window.__motionProofReady===true,{timeout:30000});
 await page.evaluate(()=>document.fonts.ready);
 const samples=[.35,1.8,2.6,3.9,5.5,7.2,7.8,8.8,9.8];
 let last="",unique=0;
 for(const [i,t] of samples.entries()){
  const png=await page.evaluate(x=>window.__motionProofFrame(x),t);
  const png2=await page.evaluate(x=>window.__motionProofFrame(x),t);
  if(png!==png2)throw Error("Non-deterministic frame at t="+t);
  if(png.length<6000)throw Error("Empty proof frame at t="+t);
  if(last!==png)unique++;
  last=png;
  await writeFile(join(folder,"frame-"+String(i).padStart(2,"0")+".png"),Buffer.from(png,"base64"));
 }
 if(errors.length)throw Error("Browser runtime errors: "+errors.join("; "));
 if(unique<7)throw Error("Insufficient visible scene changes across nine time samples");
 const sheet=spawnSync("ffmpeg",["-y","-v","error","-framerate","1","-i",
  join(folder,"frame-%02d.png"),"-vf","scale=270:-2,tile=3x3:padding=6:margin=6:color=0x101b17",
  "-frames:v","1",join(folder,"contact-sheet.png")],{timeout:120000,encoding:"utf8"});
 if(sheet.status!==0)throw Error("Contact sheet generation failed: "+sheet.stderr);
 await writeFile(join(folder,"review.json"),JSON.stringify({
  source:src,numberOfTimeSamples:samples.length,uniqueConsecutiveFrames:unique,
  deterministic:true,sourceGate:true,browserErrors:errors,
  contactSheet:"contact-sheet.png",humanApprovalRequired:true
 },null,2)+"\n");
 process.stdout.write("SOURCE-FIRST PROOF BROWSER REVIEW PASSED. Contact sheet: "+join(folder,"contact-sheet.png")+"\n");
}catch(e){process.stderr.write("PROOF ACCEPTANCE FAILED: "+String(e)+"\n");process.exitCode=1;
}finally{await browser.close();}
