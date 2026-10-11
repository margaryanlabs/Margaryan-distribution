import { durationOf, type MotionProject } from "./studio";
import { sanitizeAudioEdit } from "./timeline-edit";

/**
 * Exportable production brief for an operator or a chat assistant.
 * No AI, credentials, voice cloning or uploaded media files are processed here.
 */
export interface ProductionCue {
  shot: number;
  start: number;
  end: number;
  visual: string;
  productBeat?: string;
  titleTreatment?: string;
  mediaId?: string;
  mediaStart?: number;
  overlayMediaId?: string;
  overlayCorner?: string;
  overlaySize?: number;
  overlayOpacity?: number;
  overlayStart?: number;
  overlayDuration?: number;
  sourceLayout?: string;
  sourceFocusX?: number;
  sourceFocusY?: number;
  sourceZoomStart?: number;
  sourceZoomEnd?: number;
  /** Exact operator-local source inpoint; source bytes are never packaged. */
  sourceReviewRequired?: boolean;
  headline: string;
  camera: string;
  transition: string;
  intensity: number;
  narration: string;
  narrationWords: number;
  estimatedNarrationSeconds: number;
  requiresTimingReview: boolean;
}

export function makeProductionPack(project: MotionProject) {
  let cursor = 0;
  const cues: ProductionCue[] = project.scenes.map((scene, index) => {
    const narration = (scene.voiceCue || [scene.headline,scene.support].filter(Boolean).join(". ")).trim();
    const narrationWords = narration.split(/\s+/u).filter(Boolean).length;
    // A conservative planning estimate only; not TTS duration or measured sync.
    const estimatedNarrationSeconds = Number((narrationWords / 2.3).toFixed(1));
    const start = Number(cursor.toFixed(2));
    cursor += scene.seconds;
    return {
      shot: index + 1,
      start,
      end: Number(cursor.toFixed(2)),
      visual: scene.kind,
      productBeat: scene.productBeat,
      titleTreatment: scene.titleTreatment,
      mediaId: scene.mediaId,
      mediaStart: scene.mediaStart,
      overlayMediaId:scene.overlayMediaId,
      overlayCorner:scene.overlayCorner,
      overlaySize:scene.overlaySize,
      overlayOpacity:scene.overlayOpacity,
      overlayStart:scene.overlayStart,
      overlayDuration:scene.overlayDuration,
      sourceLayout: scene.sourceLayout,
      sourceFocusX: scene.sourceFocusX,
      sourceFocusY: scene.sourceFocusY,
      sourceZoomStart: scene.sourceZoomStart,
      sourceZoomEnd: scene.sourceZoomEnd,
      sourceReviewRequired: scene.kind==="screen",
      headline: scene.headline,
      camera: scene.camera || "inherit",
      transition: scene.transition || "auto",
      intensity: scene.intensity ?? .5,
      narration,
      narrationWords,
      estimatedNarrationSeconds,
      requiresTimingReview: estimatedNarrationSeconds > scene.seconds - .3
    };
  });
  return {
    version: 1,
    producer: "Margaryan Motion OS / operator-directed",
    generatedBy: "keyless-deterministic-planner",
    brand: project.brand,
    title: project.title,
    language: project.language || "manual-review",
    format: project.format,
    qualityMode: project.qualityMode || "basic",
    filmChrome: project.filmChrome || "brand",
    duration: durationOf(project),
    audioEdit: sanitizeAudioEdit(project.audio),
    shots: cues,
    timelineWarnings: cues.filter(c=>c.requiresTimingReview).map(c=>
      "Shot "+c.shot+" estimated narration "+c.estimatedNarrationSeconds+
      "s vs "+(c.end-c.start).toFixed(1)+"s shot. Re-record, split or change timing."),
    caveats: [
      "Narration duration is estimated by word count. Spoken-word sync requires listening.",
      "Imported audio and real product screenshots/videos are browser-local, NOT included. Source IDs and clip inpoints require locally reattached, approved assets.",
      "The ten Promptence product-story compositions are conceptual visual metaphors, not provider API results or real customer metrics.",
      "Check factual claims, on-screen typography, licensing and source provenance before publishing.",
      "No generative video, TTS provider, Claude/ChatGPT API or cloud renderer was called."
    ]
  };
}
