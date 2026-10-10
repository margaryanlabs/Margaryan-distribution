#!/usr/bin/env node
/**
 * Capture actual public product screens for owner review, not synthetic UI.
 * Output is LOCAL ONLY: screenshots and proof manifests never auto-publish.
 *
 * node scripts/motion/capture-public-ui.mjs --brand promptence --out out/motion/screens
 *
 * This tool runs on an operator workstation with installed Playwright Chromium.
 * Fresh browser context: no cookies, no login, no headers, no user session.
 * A fixed host allowlist prevents screenshots of private services and localhost.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";
import process from "node:process";

const OFFICIAL_PUBLIC_SITES={
  promptence:"https://promptence.tech/",
  ingu:"https://ingu.shop/",
  raios:"https://raios.pro/"
};
function parse(args){
  const opts={};
  for(let i=0;i<args.length;i+=2){
    if(args[i]==="--brand"||args[i]==="--out"||args[i]==="--chromium")opts[args[i].slice(2)]=args[i+1];
    else throw Error("Usage: node capture-public-ui.mjs --brand promptence|ingu|raios [--out out/motion/screens] [--chromium /path]");
  }
  const url=OFFICIAL_PUBLIC_SITES[opts.brand];
  if(!url)throw Error("No reviewed PUBLIC site allowlisted for "+String(opts.brand)+". Add only after validating its official ownership and privacy safety.");
  return {...opts,url};
}
let browser;
try{
  const options=parse(process.argv.slice(2));
  const host=new URL(options.url).hostname;
  const {chromium}=await import("playwright").catch(()=>{throw Error("Install the operator-only Playwright package locally: npm install --no-save playwright");});
  browser=await chromium.launch({headless:true,...(options.chromium?{executablePath:options.chromium}:{})});
  const context=await browser.newContext({
    viewport:{width:1440,height:900},deviceScaleFactor:1,
    storageState:{cookies:[],origins:[]},
    locale:"en-US",timezoneId:"UTC",reducedMotion:"reduce",
    serviceWorkers:"block",acceptDownloads:false
  });
  const page=await context.newPage();
  // Refuse all cross-site code and assets, except public Google font CDN.
  const allowed=new Set([host,"fonts.googleapis.com","fonts.gstatic.com"]);
  await page.route("**/*",route=>{
    const request=route.request();
    let uri;
    try{uri=new URL(request.url());}catch{return route.abort();}
    if(uri.protocol!=="https:"||!allowed.has(uri.hostname.toLowerCase()))return route.abort();
    if(["websocket","eventsource"].includes(request.resourceType()))return route.abort();
    return route.continue();
  });
  const response=await page.goto(options.url,{waitUntil:"domcontentloaded",timeout:30000});
  if(!response?.ok())throw Error("Public site returned HTTP "+String(response?.status()));
  if(new URL(page.url()).hostname!==host)throw Error("Unexpected redirect: refusing cross-domain capture");
  await page.waitForTimeout(950);
  await page.addStyleTag({content:"*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important;caret-color:transparent!important}"}).catch(()=>{});
  const screens=[
    {label:"desktop",width:1440,height:900},
    {label:"mobile",width:390,height:844}
  ];
  const output=resolve(options.out||"out/motion/screens");
  await mkdir(output,{recursive:true,mode:0o700});
  const captured=[];
  for(const screen of screens){
    await page.setViewportSize({width:screen.width,height:screen.height});
    await page.waitForTimeout(350);
    const binary=await page.screenshot({type:"png",animations:"disabled",fullPage:false});
    const filename=options.brand+"-"+screen.label+".png";
    await writeFile(join(output,filename),binary,{mode:0o600});
    captured.push({
      filename,viewport:{width:screen.width,height:screen.height},
      bytes:binary.length,sha256:createHash("sha256").update(binary).digest("hex")
    });
  }
  const report={
    version:1,brand:options.brand,sourceUrl:options.url,finalUrl:page.url(),
    capturedAt:new Date().toISOString(),pageTitle:(await page.title()).slice(0,130),
    freshAnonymousContext:true,source:"real public website screenshot",
    captured,
    approval:{
      status:"PENDING_HUMAN_REVIEW",checkPII:false,checkCopyright:false,
      checkTruthfulness:false,checkBrandAccuracy:false
    },
    publicPublishing:false,
    note:"These captures are evidence candidates, not certified approved product footage. Do not copy into public/motion/screens until an owner checks contents and license."
  };
  const manifest=join(output,options.brand+"-capture-manifest.json");
  await writeFile(manifest,JSON.stringify(report,null,2)+"\n",{mode:0o600});
  process.stdout.write(JSON.stringify({manifest,captured,approval:report.approval.status},null,2)+"\n");
}catch(error){
  process.stderr.write("Motion Capture: "+(error instanceof Error?error.message:String(error))+"\n");
  process.exitCode=1;
}finally{if(browser)await browser.close().catch(()=>{});}
