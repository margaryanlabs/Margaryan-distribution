/**
 * Motion OS / SOURCE-FIRST PROOF DIRECTOR
 *
 * One 10-second time-addressable film. Actual source screenshot pixels are
 * browser-decoded; they are never re-created as fictitious product UI.
 * No random particles, bogus analytics, synthetic client mentions or canvas
 * slides disguised as a screen capture. There are three intentional camera
 * movements with editorial contrast and uncluttered, composed typography.
 *
 * Source may be a screenshot of an approved public Promptence page. It must
 * be visually reviewed against that page before publication. No external fetch.
 */
export type ProofMedia = HTMLImageElement | HTMLVideoElement;
export const PROOF_SECONDS = 10;
function dimensions(media:ProofMedia){return media instanceof HTMLVideoElement ? {width:media.videoWidth,height:media.videoHeight,ready:media.readyState>=2}:{width:media.naturalWidth,height:media.naturalHeight,ready:media.complete};}
export const PROOF_NATIVE_WIDTH = 1080;
export const PROOF_NATIVE_HEIGHT = 1920;

const MINT = "#4EE6A1";
const IVORY = "#EDEFEA";
const INK = "#06100D";
const clamp = (n:number) => Math.max(0,Math.min(1,n));
const ease = (n:number) => { const t=clamp(n);return t*t*(3-2*t); };
const out = (n:number) => 1-Math.pow(1-clamp(n),3);
const between = (t:number,a:number,b:number) => ease((t-a)/(b-a));
const mix = (a:number,b:number,p:number) => a+(b-a)*p;

function bg(ctx:CanvasRenderingContext2D,W:number,H:number,light=false) {
  const g=ctx.createLinearGradient(0,0,W,H);
  if(light){g.addColorStop(0,"#E8EFE8");g.addColorStop(.57,"#E1E9E3");g.addColorStop(1,"#C4D7C9");}
  else{g.addColorStop(0,INK);g.addColorStop(.68,"#071812");g.addColorStop(1,"#0C2920");}
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
}
function bloom(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,power:number) {
  const g=ctx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,"rgba(78,230,161,"+(power*.22)+")");
  g.addColorStop(.35,"rgba(78,230,161,"+(power*.08)+")");
  g.addColorStop(1,"rgba(78,230,161,0)");
  ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
}
function text(ctx:CanvasRenderingContext2D,value:string,x:number,y:number,size:number,color:string,weight=700) {
  ctx.font=weight+" "+size+"px Inter, Arial, sans-serif";
  ctx.textAlign="left";ctx.textBaseline="alphabetic";ctx.fillStyle=color;
  ctx.fillText(value,x,y);
}
function line(ctx:CanvasRenderingContext2D,x1:number,y1:number,x2:number,y2:number,c:string,w=2) {
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);
  ctx.strokeStyle=c;ctx.lineWidth=w;ctx.stroke();
}
function clipRound(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number) {
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.clip();
}
function sourcePlane(
  ctx:CanvasRenderingContext2D,
  source:ProofMedia,
  x:number,y:number,w:number,h:number,angle:number,
  zoom:number,
  exposure:number
) {
  ctx.save();
  // Photograph the *whole* approved screenshot onto a real aspect-faithful
  // surface. Cover-crops and altered/fake product values are prohibited.
  const {width:sourceWidth,height:sourceHeight}=dimensions(source);
  const aspect=sourceWidth/sourceHeight;
  const planeAspect=w/h;
  let iw=w,ih=h;
  if(aspect>planeAspect)ih=w/aspect;
  else iw=h*aspect;
  ctx.translate(x+w/2,y+h/2);
  ctx.rotate(angle);
  ctx.scale(zoom,zoom);
  ctx.shadowColor="#02100B8C";ctx.shadowBlur=78;ctx.shadowOffsetY=45;
  ctx.fillStyle="#EFF2EB";
  ctx.beginPath();ctx.roundRect(-w/2-11,-h/2-11,w+22,h+22,24);ctx.fill();
  ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  ctx.save();clipRound(ctx,-w/2,-h/2,w,h,16);
  ctx.fillStyle="#07110D";ctx.fillRect(-w/2,-h/2,w,h);
  // Scale the complete image into the surface without changing its content.
  ctx.drawImage(source,-iw/2,-ih/2,iw,ih);
  ctx.restore();
  // A thin real reflective glass edge, independent of image content.
  const gleam=ctx.createLinearGradient(-w/2,-h/2,w/2,h/2);
  gleam.addColorStop(0,"rgba(255,255,255,"+(exposure*.20)+")");
  gleam.addColorStop(.35,"rgba(255,255,255,0)");
  gleam.addColorStop(1,"rgba(255,255,255,"+(exposure*.07)+")");
  ctx.fillStyle=gleam;ctx.beginPath();ctx.roundRect(-w/2,-h/2,w,h,16);ctx.fill();
  ctx.strokeStyle="#FFFFFF90";ctx.lineWidth=1.5;
  ctx.beginPath();ctx.roundRect(-w/2,-h/2,w,h,16);ctx.stroke();
  ctx.restore();
}
function drawOpening(ctx:CanvasRenderingContext2D,source:ProofMedia,t:number,W:number,H:number) {
  bg(ctx,W,H);
  const entrance=out((t-.18)/1.45);
  // Two coherent moving light planes, not random rings or generic HUDs.
  ctx.save();
  ctx.translate(W*.78,H*.55);
  ctx.rotate(-.31+.12*entrance);
  bloom(ctx,0,0,760,.55*entrance);
  ctx.fillStyle="#4EE6A118";ctx.fillRect(-23,-640,46,1280);
  ctx.fillStyle="#D7FFF61C";ctx.fillRect(39,-590,3,1180);
  ctx.restore();
  // Image enters in its own world-space depth, distinct from titles.
  sourcePlane(ctx,source,
    mix(1170,145,entrance),
    mix(890,1010,entrance),
    925,605,
    mix(.10,-.095,entrance),
    mix(.69,1,entrance),.30);
  const titleIn=between(t,.12,.75);
  ctx.save();ctx.globalAlpha*=titleIn;
  text(ctx,"THE NEXT CUSTOMER",74,388,79,IVORY,800);
  text(ctx,"ASKS AI.",74,506,114,MINT,850);
  ctx.fillStyle="#BDD2C7";text(ctx,"Will your brand appear?",77,581,35,"#A8BEB3",520);
  line(ctx,77,613,77+mix(0,420,between(t,.48,1.75)),613,MINT,3);
  ctx.restore();
}
function drawEvidence(ctx:CanvasRenderingContext2D,source:ProofMedia,t:number,W:number,H:number) {
  bg(ctx,W,H,true);
  const enter=between(t,2.1,2.75);
  const journey=between(t,3.0,7.15);
  // Lens-directed travelling shot of the authentic screenshot.
  // The actual screenshot never morphs into fake model result data.
  const track=out(journey);
  const portrait=dimensions(source).width/dimensions(source).height<.85;
  const screenX=mix(portrait?155:170,portrait?105:52,track);
  const screenY=mix(portrait?490:660,portrait?390:485,track);
  const scale=mix(.77,1.05,track);
  ctx.save();ctx.globalAlpha*=enter;
  bloom(ctx,420,830,1000,.85);
  sourcePlane(ctx,source,screenX,screenY,portrait?805:900,portrait?1200:800,mix(-.115,.025,journey),scale,.48);
  ctx.restore();
  const topY=260;
  ctx.save();
  ctx.globalAlpha*=between(t,2.48,3.1);
  text(ctx,"PROMPTENCE  /  PROOF, NOT PROMISES",73,topY,24,"#2C6B53",700);
  text(ctx,"SEE THE ACTUAL",71,355,85,INK,800);
  text(ctx,"PRODUCT.",71,449,105,"#116645",850);
  ctx.restore();
  const badgeIn=between(t,4.2,4.72);
  const badgeOut=1-between(t,6.84,7.3);
  ctx.save();ctx.globalAlpha*=badgeIn*badgeOut;
  // These are PROCESS labels, not invented scan findings.
  ctx.fillStyle="#07241FF2";ctx.beginPath();ctx.roundRect(74,1505,932,180,26);ctx.fill();
  text(ctx,journey<.43?"BUYER QUESTION":journey<.77?"SOURCE EVIDENCE":"REMEASUREMENT",
    107,1585,48,IVORY,740);
  text(ctx,"Observe  →  Diagnose  →  Verify",107,1641,29,MINT,640);
  ctx.restore();
  text(ctx,source instanceof HTMLVideoElement?"REAL VIDEO SOURCE / REVIEW REQUIRED":"SOURCE SCREENSHOT / REVIEW REQUIRED",73,1807,21,"#2E624F",700);
}
function drawClosure(
  ctx:CanvasRenderingContext2D,logo:HTMLImageElement|null,t:number,W:number,H:number
) {
  bg(ctx,W,H);
  const p=between(t,7.35,8.14);
  ctx.save();ctx.globalAlpha*=p;
  bloom(ctx,W*.51,H*.47,550,.75);
  const center=W/2,yy=690,size=mix(170,218,p);
  if(logo&&logo.complete&&logo.naturalWidth>0)ctx.drawImage(logo,center-size/2,yy-size/2,size,size);
  else {
    // Never fabricate the trademark if authentic SVG fails to load.
    ctx.fillStyle="#FFFFFFA0";ctx.fillRect(center-35,yy-3,70,6);
  }
  ctx.textAlign="center";ctx.textBaseline="alphabetic";
  ctx.font="850 105px Inter,Arial,sans-serif";ctx.fillStyle=IVORY;ctx.fillText("PROMPTENCE",center,931);
  ctx.font="630 48px Inter,Arial,sans-serif";ctx.fillStyle=MINT;ctx.fillText("BE PRESENT IN THE ANSWER.",center,1010);
  const cardIn=between(t,8.12,8.74);
  ctx.globalAlpha*=cardIn;
  ctx.fillStyle="#E9F3E9";
  ctx.beginPath();ctx.roundRect(176,1128,728,114,18);ctx.fill();
  ctx.fillStyle=INK;ctx.font="760 36px Inter,Arial,sans-serif";
  ctx.fillText("PROMPTENCE.TECH",center,1199);
  ctx.font="550 25px Inter,Arial,sans-serif";ctx.fillStyle="#B2C9BE";
  ctx.fillText("START WITH A FREE AI CHECK",center,1318);
  ctx.restore();
}
/** Deterministic frame renderer, no static pre-rendered slides. */
export function drawProofFrame(
  ctx:CanvasRenderingContext2D,source:ProofMedia,
  logo:HTMLImageElement|null,seconds:number,
  width=PROOF_NATIVE_WIDTH,height=PROOF_NATIVE_HEIGHT
) {
  const media=dimensions(source);
  if(!media.ready||!media.width||!media.height)throw new Error("Decoded approved product screenshot or video is required");
  const t=Math.max(0,Math.min(PROOF_SECONDS,seconds));
  const W=PROOF_NATIVE_WIDTH,H=PROOF_NATIVE_HEIGHT;
  ctx.save();ctx.setTransform(width/W,0,0,height/H,0,0);
  if(t<2.42)drawOpening(ctx,source,t,W,H);
  else if(t<7.55)drawEvidence(ctx,source,t,W,H);
  else drawClosure(ctx,logo,t,W,H);
  // Film-wide crop-safe typography; no persistent progress bar,
  // fake camera metadata or repeating HUD overlays on every shot.
  ctx.restore();
}
