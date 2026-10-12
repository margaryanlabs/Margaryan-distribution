#!/usr/bin/env python3
"""Offline, source-honest English narrator for Margaryan Motion Studio.

Model/runtime are operator-provisioned ONNX files. NO text or recordings are
uploaded, NO provider keys and NO voice-cloning. This generator is optional and
NOT automatically enabled on the small Railway video worker.

python scripts/motion/local-kokoro-narration.py director-pack.json out/voice.wav
    --model /secure/models/kokoro-v1.0.onnx
    --voices /secure/models/voices-v1.0.bin
    --voice af_heart --approved-model-rights
"""
import argparse
import json
import math
import sys
from pathlib import Path

SUPPORTED_VOICES = {"af_heart", "af_sarah", "af_bella", "am_adam",
                    "bf_emma", "bf_isabella", "bm_george"}
PAUSE_SECONDS = 0.18
FRAME_MAX = 64
MAX_TEXT = 240


class VoicePlanError(Exception):
    pass


def validate_pack(pack):
    if not isinstance(pack, dict) or pack.get("version") != 1:
        raise VoicePlanError("Expected original Motion Director Pack v1")
    language = pack.get("language", "en")
    if language not in ("en", "en-us"):
        raise VoicePlanError("English-only in this model profile; RU/HY require a reviewed compatible model or real human voice.")
    duration = pack.get("duration")
    if not isinstance(duration, (int, float)) or not math.isfinite(duration) or not 2 <= duration <= FRAME_MAX:
        raise VoicePlanError("Film duration outside 2–64s")
    shots = pack.get("shots")
    if not isinstance(shots, list) or not 1 <= len(shots) <= 8:
        raise VoicePlanError("Expected 1–8 director shots")
    previous = 0
    result = []
    for idx, shot in enumerate(shots, 1):
        if not isinstance(shot, dict):
            raise VoicePlanError("Malformed shot")
        start, end = shot.get("start"), shot.get("end")
        if any(not isinstance(t, (int, float)) or not math.isfinite(t) for t in (start, end)):
            raise VoicePlanError("Invalid shot time")
        if start < previous - 0.01 or end <= start or end > duration + 0.01:
            raise VoicePlanError("Overlapping or invalid shot timeline")
        narration = shot.get("narration", "")
        if not isinstance(narration, str) or len(narration) > MAX_TEXT:
            raise VoicePlanError("Narration longer than safe limit")
        narration = narration.strip()
        if narration and end - start < 0.75:
            raise VoicePlanError("Too short for natural narration")
        result.append({"shot": idx, "start": float(start), "end": float(end),
                       "narration": narration, "available": float(end-start-PAUSE_SECONDS)})
        previous = float(end)
    return float(duration), result


def validate_signal(wav, sample_rate):
    import numpy as np
    sound = np.asarray(wav, dtype=np.float32).reshape(-1)
    if sound.size < int(sample_rate * 0.2) or not np.isfinite(sound).all():
        raise VoicePlanError("Generated voice is silent, invalid, or too short")
    peak = float(np.max(np.abs(sound)))
    rms = float(np.sqrt(np.mean(np.square(sound))))
    if peak <= 0.02 or rms <= 0.004 or peak > 1.05:
        raise VoicePlanError("Generated voice level is unusable; select a different verified voice")
    return sound, {"peak": round(peak, 4), "rms": round(rms, 4),
                   "seconds": round(sound.size/sample_rate, 3)}


def main():
    ap = argparse.ArgumentParser(description="Generate consented offline English narration aligned to native Motion shot starts")
    ap.add_argument("pack", type=Path, help="Real Motion Director production-pack.json")
    ap.add_argument("out", type=Path, help="Local WAV file to import via Motion --voice")
    ap.add_argument("--model", type=Path, help="Operator-approved Kokoro v1.0 ONNX model path")
    ap.add_argument("--voices", type=Path, help="Operator-approved voices-v1.0.bin")
    ap.add_argument("--voice", choices=sorted(SUPPORTED_VOICES), default="af_heart")
    ap.add_argument("--speed", type=float, default=1.0)
    ap.add_argument("--dry-run", action="store_true", help="Validate script without creating or downloading a voice")
    ap.add_argument("--approved-model-rights", action="store_true",
                    help="Operator confirmed model/license/voice permissions (not legal certification)")
    args = ap.parse_args()
    try:
        if not args.pack.is_file() or args.pack.stat().st_size > 100000:
            raise VoicePlanError("Provide an existing, bounded native production pack")
        if args.pack.resolve() == args.out.resolve():
            raise VoicePlanError("Narration cannot overwrite Director Pack")
        if not math.isfinite(args.speed) or not 0.85 <= args.speed <= 1.15:
            raise VoicePlanError("Extreme speech speed is disallowed to preserve naturalness")
        total, shots = validate_pack(json.loads(args.pack.read_text(encoding="utf-8")))
        if args.dry_run:
            print(json.dumps({"status":"PLAN_ONLY","total":total,"shotCount":len(shots),
                              "voice":args.voice,"shots":shots,
                              "voiceGenerated":False,"modelDownloaded":False},indent=2))
            return
        if not args.approved_model_rights:
            raise VoicePlanError("Record model/voice license approval before generating real speech")
        if not args.model or not args.voices or not args.model.is_file() or not args.voices.is_file():
            raise VoicePlanError("Missing operator-provisioned model and voices files. No implicit network downloads allowed.")
        if args.model.stat().st_size < 1000000 or args.voices.stat().st_size < 1000:
            raise VoicePlanError("Model/voice assets appear incomplete")
        try:
            import numpy as np
            from kokoro_onnx import Kokoro
        except ImportError as e:
            raise VoicePlanError("Install operator-local kokoro-onnx, onnxruntime and numpy first: "+str(e))
        engine = Kokoro(str(args.model.resolve()), str(args.voices.resolve()))
        timeline = None
        sample_rate = None
        checks = []
        for cue in shots:
            if not cue["narration"]:
                continue
            samples, rate = engine.create(
                cue["narration"], voice=args.voice,speed=args.speed,lang="en-us"
            )
            samples, check = validate_signal(samples, rate)
            if sample_rate is None:
                sample_rate = rate
                timeline = np.zeros(int(total*rate), dtype=np.float32)
            elif rate != sample_rate:
                raise VoicePlanError("Voice model changed sample rate mid-session")
            # Strict alignment: never truncate phrases or silently speed up speech.
            if len(samples)/rate > cue["available"]:
                raise VoicePlanError(
                    "Shot %s: narration %.2fs exceeds %.2fs. Shorten script or edit shot length." %
                    (cue["shot"],len(samples)/rate,cue["available"])
                )
            offset = int(cue["start"]*rate)
            # Brief natural ramp prevents sample pops at each shot.
            ramp = max(1,round(rate*0.014))
            samples[:ramp] *= np.linspace(0,1,ramp,dtype=np.float32)
            samples[-ramp:] *= np.linspace(1,0,ramp,dtype=np.float32)
            timeline[offset:offset+len(samples)] += samples
            checks.append({"shot":cue["shot"],**check})
        if timeline is None:
            raise VoicePlanError("Director Pack has no spoken script")
        timeline = np.clip(timeline,-0.94,0.94)
        # Human listening remains required even if technical signal passes.
        args.out.parent.mkdir(parents=True,exist_ok=True)
        import wave
        with wave.open(str(args.out),"wb") as out:
            out.setnchannels(1)
            out.setsampwidth(2)
            out.setframerate(sample_rate)
            out.writeframes((timeline*32767).astype("<i2").tobytes())
        print(json.dumps({"status":"WAV_READY_NEEDS_HUMAN_REVIEW",
                          "file":str(args.out),"seconds":total,"shots":checks,
                          "voice":args.voice,"modelDownloaded":False,
                          "creativeQualityApproved":False,"broadcastReady":False},indent=2))
    except (ValueError, OSError, VoicePlanError, json.JSONDecodeError) as e:
        ap.error(str(e))


if __name__=="__main__":
    main()
