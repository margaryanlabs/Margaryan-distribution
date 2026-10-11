#!/usr/bin/env python3
"""Opt-in local neural narration for Motion Director Pack. No API credentials.

Install on a suitable GPU operator machine (separate from the Vercel app):
  pip install chatterbox-tts torch torchaudio
  python scripts/motion/local-chatterbox-voice.py production-pack.json out/voice.wav --device cuda

The weights may download once from Hugging Face. They consume bandwidth, VRAM and
compute. This tool never uploads a voice sample or invokes a managed TTS API.
Use --reference ONLY with a voice you have documented permission to reproduce.
"""
import argparse
import json
from pathlib import Path

SUPPORTED = {"ar","da","de","el","en","es","fi","fr","he","hi","it",
             "ja","ko","ms","nl","no","pl","pt","ru","sv","sw","tr","zh"}


def main():
    parser = argparse.ArgumentParser(description="Generate one studio-ready WAV aligned to Director Pack shot starts")
    parser.add_argument("pack", type=Path, help="Director Pack JSON exported by Motion Studio")
    parser.add_argument("out", type=Path, help="Output WAV; import as NARRATION in Motion Studio")
    parser.add_argument("--device", choices=["cuda","cpu","mps"], default="cuda")
    parser.add_argument("--lang", choices=sorted(SUPPORTED), default=None)
    parser.add_argument("--reference", type=Path, default=None,
                        help="Optional authorized voice sample, e.g. 10-second WAV")
    parser.add_argument("--silence", type=float, default=0.18,
                        help="Required minimum end-of-shot silence (0.05–1 seconds)")
    args = parser.parse_args()
    if not 0.05 <= args.silence <= 1:
        parser.error("--silence must be between 0.05 and 1 seconds")
    if not args.pack.is_file():
        parser.error("The specified Director Pack does not exist")
    if args.reference and not args.reference.is_file():
        parser.error("Authorized reference WAV not found")
    if args.out.resolve() == args.pack.resolve():
        parser.error("Do not overwrite the Director Pack input")
    pack = json.loads(args.pack.read_text(encoding="utf-8"))
    if not isinstance(pack, dict) or pack.get("version") != 1:
        parser.error("Expected Motion OS Director Pack v1")
    raw_lang = args.lang or pack.get("language")
    if raw_lang not in SUPPORTED:
        parser.error(f"Language {raw_lang!r} not supported by Chatterbox. Supply audio manually for Armenian.")
    shots = pack.get("shots", [])
    if not isinstance(shots, list) or not 1 <= len(shots) <= 8:
        parser.error("Expected 1–8 bounded shots")
    total = float(pack.get("duration", 0))
    if not 2 <= total <= 64.01:
        parser.error("Total duration must be 2–64 seconds")
    previous_end = 0.0
    for cue in shots:
        if not isinstance(cue, dict):
            parser.error("Invalid shot entry")
        start, end = float(cue.get("start",-1)), float(cue.get("end",-1))
        if start < previous_end - 0.01 or end <= start or end > total + 0.01:
            parser.error("Invalid or overlapping shot timeline")
        if not isinstance(cue.get("narration"), str) or len(cue["narration"]) > 300:
            parser.error("Narration cue must be text of up to 300 characters")
        previous_end = end

    try:
        import torch
        import torchaudio as ta
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    except ImportError as err:
        parser.error("Install local dependencies: pip install chatterbox-tts torch torchaudio. " + str(err))

    model = ChatterboxMultilingualTTS.from_pretrained(device=args.device,t3_model="v3")
    sample_rate = model.sr
    timeline = torch.zeros(int(total * sample_rate),dtype=torch.float32)
    reference = str(args.reference.resolve()) if args.reference else None
    for index,cue in enumerate(shots,1):
        narration = cue["narration"].strip()
        if not narration:
            continue
        kwargs = {"language_id":raw_lang}
        if reference:
            kwargs["audio_prompt_path"] = reference
        wav = model.generate(narration,**kwargs).detach().float().cpu().reshape(-1)
        max_samples = int((float(cue["end"])-float(cue["start"])-args.silence)*sample_rate)
        if wav.numel() > max_samples:
            raise RuntimeError(
                f"Shot {index} voice {wav.numel()/sample_rate:.2f}s does not fit "
                f"its {cue['end']-cue['start']:.2f}s window. "
                "Shorten the narration cue, slow down visuals, or split the shot; no silent speed-up applied."
            )
        offset = int(float(cue["start"])*sample_rate)
        timeline[offset:offset+wav.numel()] += wav
        print(f"Shot {index}/{len(shots)}: {len(narration)} chars, {wav.numel()/sample_rate:.2f}s")
    args.out.parent.mkdir(parents=True, exist_ok=True)
    ta.save(str(args.out),timeline.clamp(-1,1).unsqueeze(0),sample_rate)
    print(f"Saved {args.out} ({total:.2f}s, {raw_lang}, {sample_rate}Hz). Listen and review before use.")


if __name__ == "__main__":
    main()
