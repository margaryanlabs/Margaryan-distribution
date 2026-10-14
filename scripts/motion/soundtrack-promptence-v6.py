from pathlib import Path
Path('out').mkdir(parents=True,exist_ok=True)
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt
SR=48000; DUR=16
t=np.arange(SR*DUR,dtype=np.float64)/SR
rng=np.random.default_rng(1216)
L=np.zeros_like(t);R=np.zeros_like(t)
def smooth(a,b):
    x=np.clip((t-a)/(b-a),0,1)
    return x*x*(3-2*x)
def env(a,b,c,d):
    return smooth(a,b)*(1-smooth(c,d))
pad=env(.15,2.0,13.6,15.95)
# Original harmonically tuned sound bed / no borrowed sample files
for f,amp in [(69.30,.039),(103.82,.020),(138.59,.024),(164.81,.011),(207.65,.009),(246.94,.004)]:
    l=np.sin(2*np.pi*f*t+.20*np.sin(2*np.pi*.06*t))
    r=np.sin(2*np.pi*f*1.003*t+.24*np.sin(2*np.pi*.051*t)+.35)
    L+=pad*amp*l;R+=pad*amp*r
# Physical-feeling low-frequency impacts every act, with non-plosive clean tail
for when,gain in [(0.25,.105),(4.15,.165),(7.85,.19),(12.80,.21)]:
    q=np.maximum(t-when,0)
    gate=(t>=when).astype(float)
    bass=np.sin(2*np.pi*(58*q-4*q*q)) * np.exp(-7*q)*gate
    L+=gain*bass;R+=gain*.91*bass
# Band-limited and panned air with gentle tension curves
for start,end,level in [(3.3,4.55,.012),(7.15,8.25,.015),(11.95,13.15,.017)]:
    noise=rng.standard_normal(t.size)
    filtered=sosfilt(butter(3,[1200,6100],fs=SR,btype='band',output='sos'),noise)
    filtered/=max(1.e-9,np.std(filtered))
    rise=smooth(start,end)*(1-smooth(end,end+.25))
    L+=filtered*rise*level
    R+=np.roll(filtered,285)*rise*level*.88
# Elegant high notes, not a repetitive generic drum beat
for when,f,gain in [(4.45,554.4,.022),(8.10,659.25,.016),(12.90,831,.016)]:
    tau=np.maximum(0,t-when);gate=(t>=when)
    bell=(np.sin(2*np.pi*f*t)+.27*np.sin(2*np.pi*f*2.01*t))*np.exp(-2.4*tau)*gate
    L+=bell*gain;R+=np.roll(bell,130)*gain*.76
# Gentle low air bed: mostly silence, no noisy effects
air=rng.standard_normal(len(t))
air=sosfilt(butter(3,[145,900],btype='band',fs=SR,output='sos'),air)
air/=max(np.std(air),1e-9)
L+=.0024*air*pad;R+=.0024*np.roll(air,900)*pad
mix=np.stack([L,R],axis=1)
peak=float(np.max(np.abs(mix)))
if peak>.82:mix*=.82/peak
sf.write('out/PROMPTENCE_V6_ORIGINAL_SCORE.wav',mix,SR,subtype='PCM_16')
print('WAV',SR,DUR,'peak',peak)
