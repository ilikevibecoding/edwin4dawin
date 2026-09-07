#!/usr/bin/env python3
"""Sun-path replica for the sunset progress camera: the analytic glitter (water.ts sunGlitter with a flat resolved
normal, i.e. the mean over the resolved waves) along the sun's azimuth vs the view depression, with the unresolved
slope variance bookkeeping of the lead (r11) and of round 12. Camera 290 m, fov 50 vertical at 720 px."""
import math, sys

def smoothstep(a, b, x):
    t = min(max((x - a) / (b - a), 0.0), 1.0); return t * t * (3 - 2 * t)
def setFade(L, foot): return 1.0 - smoothstep(0.1 * L, 0.22 * L, foot)
def setVar(L, A):
    S = A * 0.7 * 6.2831853 / L; return 0.625 * S * S

def mss_old(foot_along, foot_across, windG, open_=1.0):
    # foot: diagonal measure of the lead; along = footprint along the wind (the view here looks downwind)
    foot = math.hypot(foot_along, foot_across)
    chopF = 1.0; rippleF = 1.0; laneA = 1.0; swellF = 1.0
    fa = lambda L: setFade(L, foot_along)  # sets' wave vectors are near the wind
    m = swellF * (setVar(83, 0.4) * (1 - fa(83) ** 2) + setVar(51.3, 0.3) * (1 - fa(51.3) ** 2) + setVar(33.7, 0.18) * (1 - fa(33.7) ** 2))
    w0 = 1 - smoothstep(2.8, 6.0, foot); a0 = 0.035 * windG * chopF; m += a0 * a0 * (1 - w0 * w0)
    m += chopF * windG * (setVar(11.6, 0.046) * (1 - fa(11.6) ** 2) + setVar(7.1, 0.058) * (1 - fa(7.1) ** 2) + setVar(4.7, 0.038) * (1 - fa(4.7) ** 2)) * 1.1
    w1 = 1 - smoothstep(1.0, 2.2, foot); a1 = 0.12 * windG; m += a1 * a1 * (1 - w1 * w1)
    w2 = 1 - smoothstep(0.35, 0.75, foot); a2 = 0.10 * windG * rippleF * laneA; m += a2 * a2 * (1 - w2 * w2)
    m += rippleF * windG * laneA * (setVar(3.4, 0.03) * (1 - fa(3.4) ** 2) + setVar(2.15, 0.02) * (1 - fa(2.15) ** 2) + setVar(1.3, 0.011) * (1 - fa(1.3) ** 2)) * 1.2
    w3 = 1 - smoothstep(0.1, 0.22, foot); a3 = 0.12 * windG * rippleF * laneA; m += a3 * a3 * (1 - w3 * w3)
    m += 0.002 + 0.003 * windG * (0.3 + 0.7 * open_)
    return m

def noiseFade(L, stretch, fa, fc): return setFade(L / (1.5 * stretch), fa) * setFade(L / 1.5, fc)

def mss_new(foot_along, foot_across, windG, open_=1.0):
    fa_ = foot_along; fc_ = foot_across
    windA = windG if windG < 0.583 else 0.583 * math.sqrt((0.008 + 0.00936 * windG) / 0.01346)
    fa = lambda L: setFade(L, fa_)
    m = (setVar(83, 0.4) * (1 - fa(83) ** 2) + setVar(51.3, 0.3) * (1 - fa(51.3) ** 2) + setVar(33.7, 0.18) * (1 - fa(33.7) ** 2))
    w0 = noiseFade(14, 2, fa_, fc_); a0 = 0.035 * windA; m += a0 * a0 * (1 - w0 * w0)
    m += windG * (setVar(11.6, 0.046) * (1 - fa(11.6) ** 2) + setVar(7.1, 0.058) * (1 - fa(7.1) ** 2) + setVar(4.7, 0.038) * (1 - fa(4.7) ** 2)) * 1.1
    w1 = noiseFade(5, 1.8, fa_, fc_); a1 = 0.12 * windA; m += a1 * a1 * (1 - w1 * w1)
    w2 = noiseFade(1.7, 1.4, fa_, fc_); a2 = 0.10 * windA; m += a2 * a2 * (1 - w2 * w2)
    m += windG * (setVar(3.4, 0.03) * (1 - fa(3.4) ** 2) + setVar(2.15, 0.02) * (1 - fa(2.15) ** 2) + setVar(1.3, 0.011) * (1 - fa(1.3) ** 2)) * 1.2
    w3 = noiseFade(0.5, 1.6, fa_, fc_); a3 = 0.12 * windA; m += a3 * a3 * (1 - w3 * w3)
    m += 0.002 + max(0.02136 * windG - 0.005, 0.0015) * (0.4 + 0.6 * open_)
    return m

def slopePdf(sh_al, sh_ac, st, mss):
    return math.exp(-(sh_al * sh_al / (mss * st) + sh_ac * sh_ac * st / mss)) / (math.pi * mss)
def slopePdfPeaked(al, ac, st, mss): return 0.75 * slopePdf(al, ac, st, mss * 0.7) + 0.25 * slopePdf(al, ac, st, mss * 1.9)
def smithBeckmann(cosT, alpha):
    tanT = math.sqrt(max(1 - cosT * cosT, 0)) / max(cosT, 1e-4); a = 1.0 / max(alpha * tanT, 1e-4)
    return 1.0 if a >= 1.6 else (3.535 * a + 2.181 * a * a) / (1 + 2.276 * a + 2.577 * a * a)

def glitter(dep_deg, sun_el_deg, mss):
    """flat N; V toward the camera at depression dep, L toward the sun (same azimuth, elevation el)"""
    dep = math.radians(dep_deg); el = math.radians(sun_el_deg)
    V = (math.cos(dep), math.sin(dep), 0.0)      # +x toward the camera... the sun is in the opposite azimuth
    L = (-math.cos(el), math.sin(el), 0.0)
    N = (0.0, 1.0, 0.0)
    NdotL = L[1]; NdotV = V[1]
    Hx, Hy, Hz = L[0] + V[0], L[1] + V[1], L[2] + V[2]; n = math.sqrt(Hx * Hx + Hy * Hy + Hz * Hz); H = (Hx / n, Hy / n, Hz / n)
    NdotH = max(H[1], 1e-3)
    sh = (-H[0] / max(H[1], 0.05), -H[2] / max(H[1], 0.05))   # slope offset (N flat)
    va = (V[0], V[2]); vl = math.hypot(*va); va = (va[0] / vl, va[1] / vl)
    st = 1.0 + 0.3 * (1.0 - min(max(V[1], 0), 1))
    al = sh[0] * va[0] + sh[1] * va[1]; ac = -sh[0] * va[1] + sh[1] * va[0]
    P = slopePdfPeaked(al, ac, st, mss)
    D = P / NdotH ** 4
    alpha = math.sqrt(mss)
    G = smithBeckmann(NdotV, alpha) * smithBeckmann(NdotL, alpha)
    LdotH = min(max(L[0] * H[0] + L[1] * H[1] + L[2] * H[2], 0), 1)
    F = 0.02 + 0.98 * (1 - LdotH) ** 5
    return min(D * F * G / (4 * NdotV), 2.5), abs(al)

if __name__ == '__main__':
    h = 290.0; px = math.radians(50) / 720; sun_el = 5.7; windG = float(sys.argv[1]) if len(sys.argv) > 1 else 1.17
    print(f'windG {windG}: dep  dist  foot_al foot_ac | mss_old glit_old | mss_new glit_new | slope needed')
    for dep in [1, 2, 3, 5, 8, 11, 14, 18, 22, 26, 30, 36]:
        d = h / math.sin(math.radians(dep)); fac = d * px; fal = fac / math.sin(math.radians(dep))
        mo = mss_old(fal, fac, windG); mn = mss_new(fal, fac, windG)
        go, sl = glitter(dep, sun_el, mo); gn, _ = glitter(dep, sun_el, mn)
        print(f'{dep:4d} {d:6.0f} {fal:7.2f} {fac:7.2f} | {mo:7.4f} {go:8.4f} | {mn:7.4f} {gn:8.4f} | {sl:5.3f}')
