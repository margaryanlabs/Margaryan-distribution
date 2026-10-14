#!/usr/bin/env python3
"""Five-second original cinematic audio bed. No third-party music samples."""
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt
Path("out").mkdir(exist_ok=True)
sr=48000;length=5
t=np.arange(sr*length,dtype=np.float64)/sr
rng=np.random.default_rng(2026101408)
def ease(a,b):
 n=np.clip((t-a)/(b-a),0,1)
 return n*n*(3-2*n)
L=np.zeros_like(t);R=np.zeros_like(t)
bed=ease(.08,1)*(1-ease(4.35,5))
for freq,amp in [(55,.052),(82.4069,.022),(110,.017),(164.81,.008),(220,.003)]:
 flutter=np.sin(2*np.pi*.09*t)*.08
 L+=amp*bed*np.sin(2*np.pi*freq*t+flutter)
 R+=amp*bed*np.sin(2*np.pi*(freq*1.002)*t+flutter+.17)
for moment,gain in [(.17,.14),(2.65,.16),(4.24,.20)]:
 q=np.maximum(0,t-moment);gate=(t>=moment)
 hit=gain*np.sin(2*np.pi*(61*q-4*q*q))*np.exp(-10*q)*gate
 L+=hit;R+=hit*.91
 air=rng.standard_normal(len(t))
 sos=butter(3,[850,5700],btype="band",fs=sr,output="sos")
 filtered=sosfilt(sos,air);filtered/=max(np.std(filtered),1e-7)
 bloom=ease(moment-.31,moment+.1)*(1-ease(moment+.13,moment+.5))
 L+=.010*filtered*bloom
 R+=.009*np.roll(filtered,176)*bloom
for moment,hz,gain in [(2.9,392,.019),(3.55,493.88,.013),(4.45,587.33,.025)]:
 q=np.maximum(t-moment,0);gate=t>=moment
 tone=gain*np.sin(2*np.pi*hz*t)*np.exp(-3.2*q)*gate
 L+=tone;R+=.82*np.roll(tone,124)
mix=np.stack([L,R],axis=1)
peak=np.max(np.abs(mix))
if peak>.8:mix*=.8/peak
sf.write("out/PROMPTENCE_V8_ORIGINAL_SOUNDSCAPE.wav",mix,sr,subtype="PCM_16")
print(f"original sound design 5.000s / 48kHz / peak {peak:.3f}")
