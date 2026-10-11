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
