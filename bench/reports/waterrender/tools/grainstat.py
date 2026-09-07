import numpy as np
def fract(x): return x - np.floor(x)
def hash12(p):
    p3 = fract(np.stack([p[...,0], p[...,1], p[...,0]], -1) * 0.1031)
    p3 = p3 + np.sum(p3 * (np.roll(p3, -1, axis=-1) + 33.33), axis=-1, keepdims=True)
    return fract((p3[...,0] + p3[...,1]) * p3[...,2])
def vnoise(p):
    i = np.floor(p); f = p - i; u = f*f*(3-2*f)
    a = hash12(i); b = hash12(i + [1,0]); c = hash12(i + [0,1]); d = hash12(i + [1,1])
    return (a*(1-u[...,0]) + b*u[...,0])*(1-u[...,1]) + (c*(1-u[...,0]) + d*u[...,0])*u[...,1]
rng = np.random.default_rng(1)
N = 4_000_000
p = rng.uniform(0, 500, size=(N, 2))
ph = rng.uniform(0, 2*np.pi, size=N)
def grain(p, ph, seed):
    g1 = vnoise(p*0.97 + 23.3 + seed) - 0.5; g2 = vnoise(p*1.05 + 29.1 + seed) - 0.5
    return (g1*np.cos(ph) + g2*np.sin(ph)) * 4.67
g = grain(p, ph, 0.0)
print('single: mean %.4f std %.4f  max %.2f min %.2f' % (g.mean(), g.std(), g.max(), g.min()))
# 4-way mix (two axes x two octaves) with random weights
w = rng.uniform(0, 1, size=(N, 2))
gm = (np.sqrt(w[:,0]*w[:,1]) * grain(p, ph, 0.0) + np.sqrt((1-w[:,0])*w[:,1]) * grain(p*0.5+7.1, ph+1.0, 40.0)
      + np.sqrt(w[:,0]*(1-w[:,1])) * grain(p*[1,0.5]+3.3, ph+2.0, 80.0) + np.sqrt((1-w[:,0])*(1-w[:,1])) * grain(p*0.5+11.0, ph+3.0, 120.0))
print('mix: mean %.4f std %.4f' % (gm.mean(), gm.std()))
from math import erf
def normal_ccdf(z): return 0.5*(1-np.vectorize(erf)(z/np.sqrt(2)))
qs = [0.01, 0.02, 0.05, 0.1, 0.2, 0.3, 0.5, 0.7, 0.9, 0.98]
print(' q     z_single  z_mix   z_gauss')
zs = {}
for q in qs:
    z1 = np.quantile(g, 1-q); z2 = np.quantile(gm, 1-q)
    from scipy.stats import norm
    print('%.2f  %7.3f  %7.3f  %7.3f' % (q, z1, z2, norm.isf(q)))
    zs[q] = (z1, z2)
# soft-threshold coverage: E[smoothstep(z-hw, z+hw, g)] vs Pr(g>z)
def sstep(e0, e1, x):
    t = np.clip((x-e0)/(e1-e0), 0, 1); return t*t*(3-2*t)
for hw in [0.2, 0.3, 0.4]:
    print('hw', hw)
    for q in qs:
        z = zs[q][0]
        cov = sstep(z-hw, z+hw, g).mean()
        print('  q %.2f z %.3f  softcov %.4f  ratio %.3f' % (q, z, cov, cov/q))
