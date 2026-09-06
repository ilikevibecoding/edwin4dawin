#!/usr/bin/env python3
"""Repetition audit of the resolved wave slope field (wavefield.py port): normalised 2-D autocorrelation of the
slope (gx, gz) over a square area; a lattice or synchronised crests show as secondary peaks comparable to the
zero-lag one at lags of several wavelengths. Reports the largest |correlation| beyond a minimum lag, and the
lag it sits at. usage: repeat.py <extent_m> <n> <min_lag_m> [t] [wind]"""
import sys, math
import numpy as np
sys.path.insert(0, '/tmp/waterrender')
from wavefield import field

ext, n, minlag = float(sys.argv[1]), int(sys.argv[2]), float(sys.argv[3])
t = float(sys.argv[4]) if len(sys.argv) > 4 else 37.0
wind = float(sys.argv[5]) if len(sys.argv) > 5 else 3.5
xs = np.linspace(800 - ext / 2, 800 + ext / 2, n, endpoint=False); zs = np.linspace(1000 - ext / 2, 1000 + ext / 2, n, endpoint=False)
X, Z = np.meshgrid(xs, zs)
gx, gz = field(X, Z, t, wind)
dx = ext / n
def acorr(g):
    g = g - g.mean()
    w = np.hanning(n)[:, None] * np.hanning(n)[None, :]
    F = np.fft.fft2(g * w)
    a = np.real(np.fft.ifft2(F * np.conj(F)))
    a = np.fft.fftshift(a) / a.max()
    return a
a = 0.5 * (acorr(gx) + acorr(gz))
c = n // 2
yy, xx = np.mgrid[0:n, 0:n]
r = np.hypot(xx - c, yy - c) * dx
# the window's own correlation falls off toward the edges; restrict to lags < ext / 4
mask = (r >= minlag) & (r < ext / 4)
i = np.argmax(np.abs(a) * mask)
py, px = divmod(i, n)
print(f'extent {ext:.0f} m, {n}x{n} ({dx:.2f} m/px), t {t}, wind {wind}: max |corr| beyond {minlag:.0f} m = {abs(a[py, px]):.3f} at lag ({(px - c) * dx:.1f}, {(py - c) * dx:.1f}) m (|lag| {r[py, px]:.1f} m)')
# radial profile: mean |corr| in lag rings
for lo in [minlag, 2 * minlag, 4 * minlag, 8 * minlag]:
    hi = lo * 1.4
    sel = (r >= lo) & (r < hi) & (r < ext / 4)
    if sel.any():
        print(f'  ring {lo:.0f}-{hi:.0f} m: mean |corr| {np.mean(np.abs(a[sel])):.3f}, max {np.max(np.abs(a[sel])):.3f}')
