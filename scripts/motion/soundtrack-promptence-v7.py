#!/usr/bin/env python3
"""Original-code 20s ambient soundtrack for Promptence V7.
No licensed/borrowed samples: wave synthesis and deterministic noise."""
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt
SR=48000
DURATION=20
Path("out").mkdir(exist_ok=True)
t=np.arange(SR*DURATION,dtype=np.float64)/SR
rng=np.random.default_rng(20261014)
def fade(a,b):
    x=np.clip((t-a)/(b-a),0,1)
    return x*x*(3-2*x)
pad=fade(.15,2.2)*(1-fade(17.5,19.9))
left=np.zeros_like(t);right=np.zeros_like(t)
for f,amp in [(55.0,.033),(82.4069,.032),(109.999,.013),(138.591,.017),(164.81,.011),(220,.006)]:
    trem=.22*np.sin(2*np.pi*.055*t)
    left+=amp*pad*np.sin(2*np.pi*f*t+trem)
    right+=amp*pad*np.sin(2*np.pi*f*1.003*t+trem+.3)
for when,weight in [(.4,.12),(4.55,.21),(8.1,.20),(12.7,.22),(16.75,.18)]:
    q=np.maximum(0,t-when);gate=(t>=when)
    beat=weight*np.sin(2*np.pi*(55*q-5*q*q))*np.exp(-6.8*q)*gate
    left+=beat;right+=beat*.85
    noise=rng.standard_normal(len(t))
    filtered=sosfilt(butter(3,[1400,5800],btype="band",fs=SR,output="sos"),noise)
    filtered/=max(np.std(filtered),1e-9)
    sweep=fade(when-.5,when+.18)*(1-fade(when+.18,when+.40))
    left+=.010*sweep*filtered
    right+=.0085*sweep*np.roll(filtered,213)
for when,hz,gain in [(4.64,554.36,.020),(8.48,659.25,.017),(12.94,739.99,.020),(16.78,880.0,.012)]:
    q=np.maximum(0,t-when);gate=t>=when
    pluck=(np.sin(2*np.pi*hz*t)+.23*np.sin(2*np.pi*hz*2.02*t))*np.exp(-2.3*q)*gate
    left+=gain*pluck;right+=gain*.92*np.roll(pluck,140)
result=np.stack([left,right],axis=1)
peak=np.max(np.abs(result))
if peak>.78:result*=.78/peak
sf.write("out/PROMPTENCE_V7_ORIGINAL_SCORE.wav",result,SR,subtype="PCM_16")
print(f"20s original sound design saved, peak={peak:.3f}")
