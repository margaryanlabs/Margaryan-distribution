/**
 * Public-source capture guards for the existing Motion Studio operator scripts.
 * Never silently crop through onboarding, dialogs or compressed mobile type.
 * No AI/video API and no source upload.
 */
export const PROMPTENCE_SECTIONS = Object.freeze([
  {assetId:"promptence-real-landing",label:"landing",heading:"See who AI recommends instead of you — and what to change."},
  {assetId:"promptence-real-free-check",label:"free-check",heading:"Free AI visibility check — real input form",selector:'input[placeholder="example.com"]'},
  {assetId:"promptence-real-evidence",label:"evidence",heading:"See the decision trail, not just a visibility number."},
  {assetId:"promptence-real-baseline",label:"baseline",heading:"A public baseline before the success story."},
  {assetId:"promptence-real-implement",label:"implement",heading:"Promptence can implement approved changes — then verify what actually shipped."},
  {assetId:"promptence-real-loop",label:"loop",heading:"One commercial loop from observation to measurable follow-up."}
]);

const OVERLAY=".promptence-tour-overlay";
export async function clearPublicOnboarding(page, brand){
  if(brand!=="promptence")return {checked:false,dismissed:false};
  const tour=page.locator(OVERLAY);
  // The overlay mounts asynchronously after DOMContentLoaded on a first visit.
  await page.waitForTimeout(1700);
  let dismissed=false;
  if(await tour.isVisible()){
    const skip=tour.locator('button[aria-label="Skip"]');
    if(!(await skip.count()))throw Error("SOURCE BLOCKED: Promptence onboarding has no safe Skip button.");
    await skip.click({timeout:5000});
    await tour.waitFor({state:"hidden",timeout:6000});
    dismissed=true;
  }
  if(await tour.isVisible())throw Error("SOURCE BLOCKED: Promptence onboarding still covers product.");
  return {checked:true,dismissed};
}

export function assertReadableFrame(signal){
  if(signal.overlayVisible)throw Error("SOURCE BLOCKED: onboarding/overlay obscures the product.");
  if(!signal.headingVisible)throw Error("SOURCE BLOCKED: expected section heading is outside the capture viewport.");
  if(signal.headingWidth<Math.min(180,signal.viewportWidth*.38))
    throw Error("SOURCE BLOCKED: section heading compressed to "+signal.headingWidth+"px.");
  if(!signal.pageTitle||signal.pageTitle.length<3)
    throw Error("SOURCE BLOCKED: product page has no title.");
  return true;
}
export async function inspectProductFrame(page,heading){
  const signal=await page.evaluate(expected=>{
    const overlay=document.querySelector(".promptence-tour-overlay");
    const overlayVisible=!!overlay && getComputedStyle(overlay).display!=="none" &&
      overlay.getBoundingClientRect().height>0;
    const elements=[...document.querySelectorAll("h1,h2,h3")];
    const target=elements.find(e=>e.textContent?.trim()===expected);
    const rect=target?.getBoundingClientRect();
    const headingVisible=!!rect&&rect.width>0&&rect.height>0&&
      rect.top>=-4&&rect.top<innerHeight-30&&rect.bottom>45;
    return {overlayVisible,headingVisible,
      headingWidth:rect?.width||0,viewportWidth:innerWidth,pageTitle:document.title};
  },heading);
  assertReadableFrame(signal);
  return signal;
}

/** The genuine Free Check form is intentionally captured without executing a scan. */
export async function inspectProductElement(page,selector){
  const signal=await page.evaluate(select=>{
    const overlay=document.querySelector(".promptence-tour-overlay");
    const overlayVisible=!!overlay&&getComputedStyle(overlay).display!=="none"&&
      overlay.getBoundingClientRect().height>0;
    const input=document.querySelector(select);
    const rect=input?.getBoundingClientRect();
    return {overlayVisible,headingVisible:!!rect&&rect.width>0&&rect.top>=0&&rect.bottom<innerHeight,
      headingWidth:rect?.width||0,viewportWidth:innerWidth,pageTitle:document.title};
  },selector);
  assertReadableFrame(signal);
  return signal;
}

export function meanPixelDifference(a,b){
  if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length||!a.length)
    throw Error("Incompatible image signatures.");
  let total=0;
  for(let i=0;i<a.length;i++)total+=Math.abs(a[i]-b[i]);
  return total/a.length;
}
export function verifyNovelShot(existing,signature,minimum=5){
  if(!Array.isArray(signature)||!signature.length)throw Error("Empty screen sample.");
  let nearest=255;
  for(const item of existing){
    const previous=Array.isArray(item)?item:item.signature;
    nearest=Math.min(nearest,meanPixelDifference(previous,signature));
  }
  if(nearest<minimum)
    throw Error("SOURCE BLOCKED: duplicate-looking screenshot (difference "+nearest.toFixed(2)+" < "+minimum+").");
  return Number(nearest.toFixed(2));
}

/** A deterministic downsample of actual screenshot pixels, not DOM-only labels. */
export async function screenshotSignature(page,pngBytes){
  const base64=Buffer.from(pngBytes).toString("base64");
  return page.evaluate(async encoded=>{
    const img=new Image();
    img.src="data:image/png;base64,"+encoded;
    await img.decode();
    const canvas=document.createElement("canvas");
    canvas.width=36;canvas.height=64;
    const ctx=canvas.getContext("2d",{willReadFrequently:true});
    if(!ctx)throw Error("Cannot inspect screenshot pixels.");
    ctx.drawImage(img,0,0,36,64);
    const pixels=ctx.getImageData(0,0,36,64).data;
    const out=[];
    for(let i=0;i<pixels.length;i+=4)out.push(pixels[i],pixels[i+1],pixels[i+2]);
    return out;
  },base64);
}
