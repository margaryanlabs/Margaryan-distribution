#!/usr/bin/env python3
"""Original 8-second cinematic product-score sketch. No third-party music samples."""
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt
Path("out").mkdir(exist_ok=True)
sr=48000;duration=8
t=np.arange(sr*duration,dtype=np.float64)/sr
rng=np.random.default_rng(2026101409)
def ease(a,b):
 x=np.clip((t-a)/(b-a),0,1)
 return x*x*(3-2*x)
bed=ease(.1,1.3)*(1-ease(6.7,8))
L=np.zeros_like(t);R=np.zeros_like(t)
for freq,amp in [(55,.045),(82.4069,.021),(109.99,.011),(138.59,.014),(164.81,.007)]:
 pitch=np.sin(2*np.pi*.06*t)*.13
 L+=amp*bed*np.sin(2*np.pi*freq*t+pitch)
 R+=amp*bed*np.sin(2*np.pi*freq*1.002*t+pitch+.24)
for moment,amp in [(0.25,.15),(2.6,.16),(5.35,.18),(7.25,.20)]:
 q=np.maximum(0,t-moment)
 gate=t>=moment
 kick=amp*np.sin(2*np.pi*(57*q-3*q*q))*np.exp(-8*q)*gate
 L+=kick;R+=kick*.9
 air=rng.standard_normal(len(t))
 air=sosfilt(butter(3,[1150,5700],btype="band",fs=sr,output="sos"),air)
 air/=max(np.std(air),1e-9)
 shimmer=ease(moment-.42,moment+.12)*(1-ease(moment+.2,moment+.48))
 L+=air*.009*shimmer
 R+=np.roll(air,210)*.008*shimmer
for moment,freq,amp in [(2.85,392,.014),(5.7,493.88,.014),(7.48,587.33,.023)]:
 q=np.maximum(0,t-moment)
 tone=amp*np.sin(2*np.pi*freq*t)*np.exp(-2.8*q)*(t>=moment)
 L+=tone;R+=.85*np.roll(tone,138)
mix=np.stack([L,R],axis=1)
peak=np.max(np.abs(mix))
if peak>.8:mix*=.8/peak
sf.write("out/PROMPTENCE_V9_ORIGINAL_SCORE.wav",mix,sr,subtype="PCM_16")
print("8.000s score / 48kHz stereo, peak",round(float(peak),3))
