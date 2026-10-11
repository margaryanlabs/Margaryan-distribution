import {PLAN as APPROVED_PUBLIC_INTERACTION_PLAN} from "./interaction-cinema-core.mjs";
/**
 * Strict pre-publication operator contract for Motion Studio's offline master.
 * This intentionally never calls a generative service or certifies aesthetics.
 */
export function criticalDirectorNotes(notes){
  if(!Array.isArray(notes))throw Error("Director notes missing.");
  const pattern=/visually similar|\/ TEXT:|below minimum mobile readability|blank|low dynamic range|transparency|text overflow|overlap|unreadable|source screenshot missing/i;
  return notes.filter(note=>typeof note==="string"&&pattern.test(note));
}
export function assertDirectorRelease(report){
  if(!report?.measuredFramePass||report?.after?.blockers>0)
    throw Error("RELEASE BLOCKED: compositor/typography has critical defects.");
  const critical=criticalDirectorNotes(report.remaining);
  if(critical.length)throw Error("RELEASE BLOCKED: unresolved director warnings: "+critical.slice(0,4).join(" | "));
  return true;
}
/**
 * Fraction of original pixels retained by a cover crop. Landscape UI in a
 * tiny portrait-height card can silently discard >65% of its content.
 */
export function visibleSourceFraction(sourceW,sourceH,stageW,stageH){
  if(![sourceW,sourceH,stageW,stageH].every(x=>Number.isFinite(x)&&x>0))
    throw Error("RELEASE BLOCKED: source or stage geometry is invalid.");
  const source=sourceW/sourceH,stage=stageW/stageH;
  return Math.min(source/stage,stage/source);
}
export function assertSourceFraming(sourceW,sourceH,stageW,stageH,label,minimum=.65){
  const visible=visibleSourceFraction(sourceW,sourceH,stageW,stageH);
  if(visible<minimum)throw Error("RELEASE BLOCKED: "+label+
    " cover-crops the authentic UI to "+Math.round(visible*100)+"% of its original area.");
  return Number(visible.toFixed(3));
}
/**
 * Audio/privacy/manual-release gate for authentic recorded-browser Interaction
 * Cinema takes. The MP4 checksum must match the source reviewed by the owner.
 */
export function assertApprovedInteractionManifest(manifest,sourceIDs,shaById,brand){
 if(!manifest||manifest.schema!=="motion-interaction-cinema/v1"||
    manifest.brand!==brand||brand!=="promptence"||
    manifest.sourceUrl!=="https://promptence.tech/"||
    manifest.capturedFromRealBrowser!==true||
    manifest.providerAPIsUsed!==false||manifest.readOnly!==true||
    manifest.submitPrevented!==true)
   throw Error("RELEASE BLOCKED: invalid or unsafe real-interaction capture evidence.");
 if(!Array.isArray(sourceIDs)||sourceIDs.length!==1||sourceIDs[0]!==manifest.mediaId||
    !manifest.originalVideo||!/^[a-f0-9]{64}$/i.test(manifest.originalVideo.sha256||"")||
    shaById?.[manifest.mediaId]!==manifest.originalVideo.sha256)
   throw Error("RELEASE BLOCKED: browser interaction MP4 does not match reviewed original bytes.");
 if(manifest.firstVisitOnboardingHandled?.checked!==true||
    !Number.isFinite(manifest.duration)||manifest.duration<8||manifest.duration>64||
    !Number.isInteger(manifest.frames)||manifest.frames<24*8||!Array.isArray(manifest.events)||
    manifest.events.length!==APPROVED_PUBLIC_INTERACTION_PLAN.length)
   throw Error("RELEASE BLOCKED: missing original verified read-only UI choreography.");
 const ids=new Set();
 let prev=-1;
 for(const [index,e] of manifest.events.entries()){
   const allowed=APPROVED_PUBLIC_INTERACTION_PLAN[index];
   if(!e||e.action!==allowed.id||e.kind!==allowed.kind||e.target!==allowed.target||
      typeof e.action!=="string"||ids.has(e.action)||
      !["click","type","focus"].includes(e.kind)||
      !Number.isFinite(e.timestampSeconds)||e.timestampSeconds<0||
      e.timestampSeconds>manifest.duration||e.timestampSeconds<=prev||
      e.source!=="live-browser"||e.publicReadOnly!==true||e.submitted!==false)
     throw Error("RELEASE BLOCKED: unsafe/untimestamped browser interaction.");
   ids.add(e.action);prev=e.timestampSeconds;
 }
 const approval=manifest.approval||{};
 if(approval.status!=="APPROVED"||approval.sourceRights!==true||
    approval.privacyReviewed!==true||
    approval.copyAndProductTruthReviewed!==true||
    approval.voiceReviewed!==true||approval.musicReviewed!==true)
   throw Error("RELEASE BLOCKED: human review for original clicks, product claims, voice and music is pending.");
 return {sourceCount:1,realUiEvents:manifest.events.length,
  sourceSha256:manifest.originalVideo.sha256,humanReviewRecorded:true,
  finalMasterReviewStillRequired:true};
}

export function assertApprovedSourceManifest(manifest,sourceIDs,shaById,brand){
  if(!manifest||manifest.version!==1||manifest.brand!==brand)
    throw Error("RELEASE BLOCKED: signed-off source manifest missing or for the wrong brand.");
  if(!Array.isArray(sourceIDs)||sourceIDs.length===0||!Array.isArray(manifest.shots))
    throw Error("RELEASE BLOCKED: no verified real product media.");
  const approval=manifest.approval||{};
  if(approval.status!=="APPROVED"||!approval.sourceRights||!approval.privacyReviewed||
      !approval.productTruthReviewed||!approval.voiceReviewed||!approval.musicReviewed)
    throw Error("RELEASE BLOCKED: source, audio rights and product-truth human reviews are not approved.");
  const shots=new Map();
  for(const shot of manifest.shots){
    if(!shot||typeof shot.assetId!=="string"||shots.has(shot.assetId))
      throw Error("RELEASE BLOCKED: duplicate or malformed source evidence ID.");
    if(shot.status!=="PASS"||shot.overlayAbsent!==true||shot.layoutValid!==true||
        shot.headingVisible!==true||!Number.isFinite(shot.visualDifference)||
        shot.visualDifference<5||!/^[a-f0-9]{64}$/i.test(shot.sha256||""))
      throw Error("RELEASE BLOCKED: screenshot did not pass authentic source/frame QC.");
    shots.set(shot.assetId,shot);
  }
  for(const id of sourceIDs){
    const evidence=shots.get(id);
    if(!evidence||!shaById||shaById[id]!==evidence.sha256)
      throw Error("RELEASE BLOCKED: source \""+id+"\" missing or bytes changed since review.");
  }
  return {sourceCount:sourceIDs.length,humanReviewRecorded:true,finalMasterReviewStillRequired:true};
}
