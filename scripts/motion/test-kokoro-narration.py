#!/usr/bin/env python3
"""Zero-model dependency regressions for Margaryan's optional local narrator."""
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "scripts/motion/local-kokoro-narration.py"
spec = importlib.util.spec_from_file_location("motion_kokoro", SOURCE)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class NarrationPlanTest(unittest.TestCase):
    def pack(self):
        return {"version": 1, "language": "en", "duration": 9.0, "shots": [
            {"start": 0.0, "end": 4.0, "narration": "See the evidence before you act."},
            {"start": 4.0, "end": 9.0, "narration": "Promptence. Know what changed."},
        ]}
    def test_valid_timeline(self):
        duration, shots = module.validate_pack(self.pack())
        self.assertEqual(duration,9.0)
        self.assertEqual(len(shots),2)
        self.assertAlmostEqual(shots[-1]["available"],4.45)
    def test_other_language_protected(self):
        p=self.pack();p["language"]="ru"
        with self.assertRaisesRegex(module.VoicePlanError,"English-only"):
            module.validate_pack(p)
    def test_overlapping_cues_rejected(self):
        p=self.pack();p["shots"][1]["start"]=3.5
        with self.assertRaisesRegex(module.VoicePlanError,"Overlapping"):
            module.validate_pack(p)
    def test_excessive_text_rejected(self):
        p=self.pack();p["shots"][0]["narration"]="A"*241
        with self.assertRaisesRegex(module.VoicePlanError,"Narration longer"):
            module.validate_pack(p)
    def test_no_model_download_on_dry_run(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td)/"pack.json";out=Path(td)/"voice.wav"
            p.write_text(json.dumps(self.pack()), encoding="utf-8")
            result=subprocess.run([sys.executable,str(SOURCE),str(p),str(out),"--dry-run"],
                capture_output=True,text=True,timeout=12)
            self.assertEqual(result.returncode,0,result.stderr)
            data=json.loads(result.stdout)
            self.assertEqual(data["status"],"PLAN_ONLY")
            self.assertEqual(data["modelDownloaded"],False)
            self.assertFalse(out.exists())

if __name__=="__main__":
    unittest.main()
