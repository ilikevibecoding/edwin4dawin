#!/usr/bin/env python3
"""numpy port of the water shader's resolved wave slope field (open deep water, chopF = rippleF = swellF = 1) so the
stack can be inspected for lattices / repetition without a browser. Writes a shaded slope image.
usage: wavefield.py out.png <extent_m> [t] [wind m/s] [variant]"""
import sys, math
import numpy as np
from PIL import Image

def fract(x): return x - np.floor(x)
def hash12(px, py):
    p3x = fract(px * 0.1031); p3y = fract(py * 0.1031); p3z = fract(px * 0.1031)
    d = p3x * (p3y + 33.33) + p3y * (p3z + 33.33) + p3z * (p3x + 33.33)
    p3x = p3x + d; p3y = p3y + d; p3z = p3z + d
    return fract((p3x + p3y) * p3z)
def vnoise(px, py):
    ix, iy = np.floor(px), np.floor(py); fx, fy = px - ix, py - iy
    ux = fx * fx * (3 - 2 * fx); uy = fy * fy * (3 - 2 * fy)
    a, b, c, d = hash12(ix, iy), hash12(ix + 1, iy), hash12(ix, iy + 1), hash12(ix + 1, iy + 1)
    return (a + (b - a) * ux) * (1 - uy) + (c + (d - c) * ux) * uy
def noised(px, py):
    ix, iy = np.floor(px), np.floor(py); fx, fy = px - ix, py - iy
    ux = fx**3 * (fx * (fx * 6 - 15) + 10); uy = fy**3 * (fy * (fy * 6 - 15) + 10)
    dux = 30 * fx * fx * (fx * (fx - 2) + 1); duy = 30 * fy * fy * (fy * (fy - 2) + 1)
    a, b, c, d = hash12(ix, iy), hash12(ix + 1, iy), hash12(ix, iy + 1), hash12(ix + 1, iy + 1)
    k1, k2, k3 = b - a, c - a, a - b - c + d
    return a + k1 * ux + k2 * uy + k3 * ux * uy, dux * (k1 + k3 * uy), duy * (k2 + k3 * ux)
def rot2(v, a):
    c, s = math.cos(a), math.sin(a); return np.array([c * v[0] - s * v[1], s * v[0] + c * v[1]])

def chopSlope(X, Z, wd, L, stretch, speed, t, seed, amp):
    wc = np.array([-wd[1], wd[0]])
    qx = ((X * wd[0] + Z * wd[1]) + speed * t) * stretch / L + seed; qy = (X * wc[0] + Z * wc[1]) / L + seed * 1.73
    v, ny, nz = noised(qx, qy)
    gx = amp * (ny * stretch * wd[0] + nz * wc[0]); gz = amp * (ny * stretch * wd[1] + nz * wc[1])
    dvx = (ny * stretch * wd[0] + nz * wc[0]) / L; dvz = (ny * stretch * wd[1] + nz * wc[1]) / L
    return gx, gz, v, dvx, dvz
def swellSlope(X, Z, d, L, A, t, phase, warp, dwx, dwz):
    k = 6.2831853 / L; w = math.sqrt(9.81 * k)
    ph = k * (X * d[0] + Z * d[1]) + w * t + phase + warp
    s = np.sin(ph); c = np.cos(ph); f = A * 0.7 * c * (1 + s)
    return f * (k * d[0] + dwx), f * (k * d[1] + dwz)

def field(X, Z, t, wind, variant='base'):
    wd = np.array([0.94, 0.34]); wd = wd / np.linalg.norm(wd); wc = np.array([-wd[1], wd[0]])
    windv = min(max(wind / 6.0, 0.35), 1.8)
    gpx = X + wd[0] * 5 * t; gpz = Z + wd[1] * 5 * t
    def fbm2o(px, py): return 0.667 * vnoise(px, py) + 0.333 * vnoise(1.6 * px - 1.2 * py + 5.2, 1.2 * px + 1.6 * py + 5.2)
    gust = 0.74 + 0.52 * fbm2o((gpx * wd[0] + gpz * wd[1]) / 640 + 3.7, (gpx * wc[0] + gpz * wc[1]) / 270 + 3.7)
    windG = windv * gust
    gx = np.zeros_like(X); gz = np.zeros_like(X)
    # swell
    wv_, wyx, wyz = noised(X * 0.0045 + 2.3, Z * 0.0045 + 2.3); wv = (wv_ - 0.5) * 3.2; dwx = wyx * 0.0045 * 3.2; dwz = wyz * 0.0045 * 3.2
    grpN = vnoise(((X * wd[0] + Z * wd[1]) + 4.5 * t) * 0.0055 + 7.7, (X * wc[0] + Z * wc[1]) * 0.0055 + 7.7); grp = 0.35 + 1.3 * grpN
    for (ang, L, A, ph, wf, g) in [(-0.31, 83.0, 0.4, 0.0, 1.0, grp), (0.07, 51.3, 0.3, 2.1, 0.8, grp), (0.53, 33.7, 0.18, 4.4, 0.6, 1.5 - grp * 0.7), (0.95, 340.0, 0.55, 1.3, 0.5, 1.0)]:
        sx, sz = swellSlope(X, Z, rot2(wd, ang), L, A, t, ph, wv * wf, dwx * wf, dwz * wf); gx += sx * g; gz += sz * g
    # 14 m chop + wind sea
    a0 = 0.035 * windG
    cx, cz, val0, d0x, d0z = chopSlope(X, Z, rot2(wd, 0.15), 14.0, 2.0, 4.5, t, 1.3, a0); gx += cx; gz += cz
    grpw = (0.55 + 0.9 * val0) * windG; wvw = (val0 - 0.5) * 3.0
    sets = [(-0.33, 11.6, 0.046, 1.0, 1.0), (0.21, 7.1, 0.058, 3.3, 0.7), (-0.08, 4.7, 0.038, 5.9, 0.5)]
    if variant == 'spread':
        sets = [(-0.42, 12.4, 0.030, 1.0, 1.0), (0.24, 9.7, 0.034, 3.3, 0.9), (-0.10, 7.6, 0.036, 5.9, 0.8), (0.47, 6.1, 0.028, 0.7, 0.7), (-0.29, 4.9, 0.024, 2.2, 0.6), (0.11, 3.9, 0.018, 4.6, 0.5)]
    for (ang, L, A, ph, wf) in sets:
        sx, sz = swellSlope(X, Z, rot2(wd, ang), L, A, t, ph, wvw * wf, d0x * 3.0 * wf, d0z * 3.0 * wf); gx += sx * grpw; gz += sz * grpw
    # 5 m chop
    a1 = 0.12 * windG
    cx, cz, val1, d1x, d1z = chopSlope(X, Z, rot2(wd, -0.2), 5.0, 1.8, 2.7, t, 3.7, a1); gx += cx; gz += cz
    lanes = vnoise((X * wd[0] + Z * wd[1]) * 0.07 + 0.6 * t, (X * wc[0] + Z * wc[1]) * 0.55 + 5.5); laneA = 0.55 + 0.9 * lanes
    a2 = 0.10 * windG * laneA
    cx, cz, val2, d2x, d2z = chopSlope(X, Z, rot2(wd, 0.3), 1.7, 1.4, 1.6, t, 7.1, a2); gx += cx; gz += cz
    grp2 = (0.45 + 1.1 * val1) * windG * laneA
    wv2 = (val1 - 0.5) * 5.0 + (val2 - 0.5) * 1.5; dw2x = d1x * 5.0 + d2x * 1.5; dw2z = d1z * 5.0 + d2z * 1.5
    for (ang, L, A, ph, wf) in [(-0.35, 3.4, 0.030, 2.7, 1.0), (0.25, 2.15, 0.020, 8.1, 0.7), (0.05, 1.3, 0.011, 12.3, 0.5)]:
        sx, sz = swellSlope(X, Z, rot2(wd, ang), L, A, t, ph, wv2 * wf, dw2x * wf, dw2z * wf); gx += sx * grp2; gz += sz * grp2
    a3 = 0.12 * windG * laneA
    cx, cz, val3, _, _ = chopSlope(X, Z, rot2(wd, -0.05), 0.5, 1.6, 0.9, t, 11.3, a3); gx += cx; gz += cz
    return gx, gz

def render(out, extent, t=0.0, wind=3.5, variant='base', n=900, cx=800.0, cz=1000.0):
    xs = np.linspace(cx - extent / 2, cx + extent / 2, n); zs = np.linspace(cz - extent / 2, cz + extent / 2, n)
    X, Z = np.meshgrid(xs, zs)
    gx, gz = field(X, Z, t, wind, variant)
    # shade: a low camera to the south looking north sees the sky brighten where the slope tilts the normal toward it
    v = np.clip(0.5 + 6.0 * gz + 2.0 * gx, 0, 1)
    img = (np.power(v, 1 / 1.6) * 255).astype(np.uint8)
    Image.fromarray(img).save(out)
    print(out, 'rms slope', float(np.sqrt(np.mean(gx * gx + gz * gz))))

if __name__ == '__main__':
    out, ext = sys.argv[1], float(sys.argv[2])
    t = float(sys.argv[3]) if len(sys.argv) > 3 else 0.0
    wind = float(sys.argv[4]) if len(sys.argv) > 4 else 3.5
    variant = sys.argv[5] if len(sys.argv) > 5 else 'base'
    render(out, ext, t, wind, variant)
