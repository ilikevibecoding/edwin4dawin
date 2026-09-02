#!/usr/bin/env python3
"""Normalize the low Newton coefficients by extension means and probe domains."""

from __future__ import annotations

import math
import random

import numpy as np
import sympy as sp
from scipy.optimize import differential_evolution

from verify_rank7_terminal_broom_high_differences import (
    a,
    b,
    c,
    n,
    specialized_coefficients,
)


M4, M5, M6, s, d, w, x = sp.symbols("M4 M5 M6 s d w x", positive=True)


def expressions():
    coeffs = specialized_coefficients()
    c2 = (n - 1) * (n - 2) / 2
    c3 = c2 / w
    c4 = c3 / x
    c5 = M4 * c4 / 5
    c6 = M5 * c5 / 6
    c7 = M6 * c6 / 7
    substitutions = {
        c[3]: c3,
        c[4]: c4,
        c[5]: c5,
        c[6]: c6,
        c[7]: c7,
        a: (1 - s) * c5,
        b: (1 - d) * c6,
    }
    normalized = []
    for rank in range(7):
        value = sp.factor(coeffs[rank].subs(substitutions, simultaneous=True) / c6**4)
        normalized.append(value)
    return normalized


def transfer(mu: float) -> float:
    q = math.floor(mu)
    hq = 0.0 if q <= 2 else (q - 1) * (q - 2) / 2
    qp = q + 1
    hp = 0.0 if qp <= 2 else (qp - 1) * (qp - 2) / 2
    phi = hq + (mu - q) * (hp - hq)
    return 2 * phi / mu


def sample_probe(values, trials: int = 20000):
    funcs = [sp.lambdify((n, w, x, M4, M5, M6, s, d), v, "numpy") for v in values]
    rng = random.Random(9931717)
    minima = [(float("inf"), None) for _ in funcs]
    for _ in range(trials):
        nn = rng.uniform(19, 250)
        lo4 = (nn - 7) * (nn - 8) / (nn - 3)
        m4 = rng.uniform(lo4, nn - 4)
        m5 = rng.uniform(transfer(m4), m4 - 0.5)
        m6 = rng.uniform(transfer(m5), m5 - 0.5)
        ww_lo = 3 / (nn - 3)
        ww_hi = 3 * (nn - 1) / ((nn - 3) * (nn - 4))
        ww = rng.uniform(ww_lo, ww_hi)
        xx_lo = 8 * ww / (6 - ww)
        xx_hi = 4 * ww / (3 * (1 - ww))
        xx = rng.uniform(xx_lo, xx_hi)
        ss = rng.random()
        # Necessary Q6(H): M5*d/s >= 1/2.  The other endpoint d<=1.
        dd_lo = 0.0 if ss == 0 else ss / (2 * m5)
        dd = rng.uniform(dd_lo, 1.0)
        point = (nn, ww, xx, m4, m5, m6, ss, dd)
        for rank, func in enumerate(funcs):
            value = float(func(*point))
            if value < minima[rank][0]:
                minima[rank] = (value, point)
    return minima


def choose_real(v: float, k: int) -> float:
    out = 1.0
    for j in range(k):
        out *= (v - j) / (j + 1)
    return out


def generic_mu4_lower(order: int) -> float:
    if order < 5:
        return 0.0
    mu2 = (order - 3) * (order - 4) / (order - 1)
    if mu2 <= 0:
        return 0.0
    mu3 = transfer(mu2)
    return transfer(mu3) if mu3 > 0 else 0.0


def forest_mu4_lower(order: int) -> float:
    if order >= 18:
        return (order - 7) * (order - 8) / (order - 3)
    return generic_mu4_lower(order)


def coupled_probe(values, trials: int = 50000, use_cross: bool = True):
    funcs = [sp.lambdify((n, w, x, M4, M5, M6, s, d), v, "numpy") for v in values]
    rng = random.Random(9931719)
    minima = [(float("inf"), None) for _ in funcs]
    thresholds = [19, 21, 23, 25, 30, 40, 60, 100]
    threshold_minima = {
        threshold: [(float("inf"), None) for _ in funcs]
        for threshold in thresholds
    }
    accepted = 0
    for _ in range(trials):
        nn = rng.randint(19, 250)
        m = rng.randint(4, nn - 2)
        ww_lo = 3 / (nn - 3)
        ww_hi = 3 * (nn - 1) / ((nn - 3) * (nn - 4))
        ww = rng.uniform(ww_lo, ww_hi)
        xx_lo = 8 * ww / (6 - ww)
        xx_hi = 4 * ww / (3 * (1 - ww))
        xx = rng.uniform(xx_lo, xx_hi)
        # Exact nested defect cone. D4 is controlled by Q4 and the
        # certified rank-(3,4,5) defect ceiling. D5,D6 use Q5,Q6 and
        # the forest two-extension ceilings.
        lo4 = (nn - 7) * (nn - 8) / (nn - 3)
        d4_lo = (2.0 + xx) / 10.0
        d4_hi = min(1559.0 / 3575.0, 1.0 - xx * lo4 / 5.0)
        if d4_lo > d4_hi:
            continue
        d4 = rng.uniform(d4_lo, d4_hi)
        m4 = 5.0 * (1.0 - d4) / xx

        x5 = 5.0 / m4
        d5_lo = (2.0 + x5) / 12.0
        d5_hi = min(
            1.0 / 6.0 + x5 / 2.0,
            1.0 - 5.0 * transfer(m4) / (6.0 * m4),
        )
        if d5_lo > d5_hi:
            continue
        d5 = rng.uniform(d5_lo, d5_hi)
        m5 = (6.0 * m4 / 5.0) * (1.0 - d5)

        x6 = 6.0 / m5
        d6_lo = (2.0 + x6) / 14.0
        d6_hi = min(
            1.0 / 7.0 + x6 / 2.0,
            1.0 - 6.0 * transfer(m5) / (7.0 * m5),
        )
        if d6_lo > d6_hi:
            continue
        d6 = rng.uniform(d6_lo, d6_hi)
        m6 = (7.0 * m5 / 6.0) * (1.0 - d6)
        c2 = (nn - 1) * (nn - 2) / 2
        c3 = c2 / ww
        c4 = c3 / xx
        c5 = m4 * c4 / 5
        c6 = m5 * c5 / 6
        # a=(1-s)c5 is a rank-4 coefficient on m vertices.
        s_lo = max(0.5, 1.0 - choose_real(m, 4) / c5)
        # In H=A-q (order n-1), 5h5 <= (n-5)h4 <= (n-5)c4.
        s_hi = min(1.0, (nn - 5) / m4)
        if s_lo > s_hi:
            continue
        ss = rng.uniform(s_lo, s_hi)
        # h6/h5 is rank-5 extension in H (order n-1), while b/a is
        # rank-4 extension in J (order m).
        h_mu5_lo = transfer(forest_mu4_lower(nn - 1))
        defect6 = d6
        d_lo = max(0.5, ss * h_mu5_lo / m5)
        if use_cross:
            d_lo = max(d_lo, ss - defect6 / 2.0)
        d_lo = max(d_lo, 1.0 - choose_real(m, 5) / c6)
        # Ordinary extension counting in J: 5b <= (m-4)a.
        d_lo = max(
            d_lo,
            1.0 - (6.0 * (m - 4) / (5.0 * m5)) * (1.0 - ss),
        )
        j_mu4_lo = forest_mu4_lower(m)
        d_hi = 1.0 - (6.0 * j_mu4_lo / (5.0 * m5)) * (1.0 - ss)
        # In H, ordinary rank-5 extension gives its mu5 <= n-6.
        d_hi = min(d_hi, ss * (nn - 6) / m5)
        d_lo = max(0.0, d_lo)
        d_hi = min(1.0, d_hi)
        if d_lo > d_hi:
            continue
        dd = rng.uniform(d_lo, d_hi)
        # The missing h4=i4(H) must lie in the exact rooted decomposition
        # c4=h4+i3(J).  Combine capacity/extension bounds, the forest Q5
        # theorem on H, and the proved all-root S6/C6 theorems on A.
        h4_lo = max(
            0.0,
            1.0 - choose_real(m, 3) / c4,
            ss * m4 / (nn - 5),
        )
        h4_hi = min(
            1.0,
            1.0 - 4.0 * (1.0 - ss) * m4 / (5.0 * (m - 3)),
            ss * m4 / forest_mu4_lower(nn - 1),
            2.0 * m4 * ss * ss / (ss + 2.0 * dd * m5),
            ss + (2.0 + 5.0 / m4) / 24.0,
            ss + 0.5 - 5.0 * m5 / (12.0 * m4),
        )
        if h4_lo > h4_hi:
            continue
        point = (nn, ww, xx, m4, m5, m6, ss, dd, m, d_lo, d_hi)
        accepted += 1
        args = point[:8]
        for rank, func in enumerate(funcs):
            value = float(func(*args))
            if value < minima[rank][0]:
                minima[rank] = (value, point)
            for threshold in thresholds:
                if nn >= threshold and value < threshold_minima[threshold][rank][0]:
                    threshold_minima[threshold][rank] = (value, point)
    return accepted, minima, threshold_minima


def pure_defect_probe(values, trials: int = 100000, use_cross: bool = False):
    funcs = [sp.lambdify((n, w, x, M4, M5, M6, s, d), v, "numpy") for v in values]
    rng = random.Random(9931720)
    minima = [(float("inf"), None) for _ in funcs]
    for _ in range(trials):
        nn = rng.randint(19, 1000)
        ww_lo = 3 / (nn - 3)
        ww_hi = 3 * (nn - 1) / ((nn - 3) * (nn - 4))
        ww = rng.uniform(ww_lo, ww_hi)
        xx_lo = 8 * ww / (6 - ww)
        xx_hi = 4 * ww / (3 * (1 - ww))
        xx = rng.uniform(xx_lo, xx_hi)
        d4_lo = (2.0 + xx) / 10.0
        d4_hi = 1559.0 / 3575.0
        d4 = rng.uniform(d4_lo, d4_hi)
        m4 = 5.0 * (1.0 - d4) / xx
        x5 = 5.0 / m4
        d5_lo = (2.0 + x5) / 12.0
        d5_hi = 1.0 / 6.0 + x5 / 2.0
        d5 = rng.uniform(d5_lo, d5_hi)
        m5 = (6.0 * m4 / 5.0) * (1.0 - d5)
        x6 = 6.0 / m5
        d6_lo = (2.0 + x6) / 14.0
        d6_hi = 1.0 / 7.0 + x6 / 2.0
        d6 = rng.uniform(d6_lo, d6_hi)
        m6 = (7.0 * m5 / 6.0) * (1.0 - d6)
        ss = rng.uniform(0.5, 1.0)
        d_lo = 0.5
        if use_cross:
            d_lo = max(d_lo, ss - d6 / 2.0)
        dd = rng.uniform(d_lo, 1.0)
        point = (nn, ww, xx, m4, m5, m6, ss, dd)
        for rank, func in enumerate(funcs):
            value = float(func(*point))
            if value < minima[rank][0]:
                minima[rank] = (value, point)
    return minima


def main() -> int:
    values = expressions()
    for rank, value in enumerate(values):
        print(f"Delta{rank} normalized terms={len(sp.Poly(sp.together(value).as_numer_denom()[0], n,w,x,M4,M5,M6,s,d).terms())}")
        if rank <= 2:
            print(sp.factor(value))
    for rank, result in enumerate(sample_probe(values)):
        print("minimum", rank, result)
    accepted, coupled, threshold_minima = coupled_probe(values)
    print("coupled accepted", accepted)
    for rank, result in enumerate(coupled):
        print("coupled minimum", rank, result)
    for threshold, results in threshold_minima.items():
        print("threshold", threshold, [round(v[0], 6) for v in results])
    no_cross_accepted, no_cross, _ = coupled_probe(values, trials=20000, use_cross=False)
    print("no-cross accepted", no_cross_accepted)
    for rank, result in enumerate(no_cross):
        print("no-cross minimum", rank, result)
    for rank, result in enumerate(pure_defect_probe(values)):
        print("pure minimum", rank, result)
    for rank, result in enumerate(pure_defect_probe(values, use_cross=True)):
        print("pure-cross minimum", rank, result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
