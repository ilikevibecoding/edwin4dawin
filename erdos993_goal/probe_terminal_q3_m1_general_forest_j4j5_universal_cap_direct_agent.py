#!/usr/bin/env python3
"""Fast direct-formula scan of the all-R balanced-neighbor shadow cap."""

from __future__ import annotations

import math


def comb(n: int, k: int) -> int:
    return math.comb(n, k) if n >= k >= 0 else 0


def path_floor(n: int, k: int) -> int:
    return comb(n - k + 1, k) if n >= 2 * k - 1 else 0


def lower(j, N, h, d, R, W, y):
    """Literal current Gap-retaining, M-discarded normalized lower."""
    r = N - j
    m = N - h
    p0 = comb(N + 1, 3) - m * (N - 1) + W + comb(N + 1, 2) - m
    p1 = comb(N + 1, 2) - m + N + 1
    R1 = m * N - 2 * W
    a = comb(N, 2) - (m - d)
    z2 = (m - d) * (N - 2) - 2 * (W - comb(d, 2) - R)
    h2 = comb(N - d, 2) - (m - d - R)
    c0 = a + z2 + h2
    A1 = p0 * a + p1 * c0 + p1 * a - a * R1
    ebar = 1 + y + j * z2 / (2 * a)
    Q0 = (j + 1) * c0 - 3 * ebar * (p0 + a)
    Q1 = (j + 1) * (a + R1) - 3 * ebar * p1 - 3 * (p0 + a + p1)
    remainder = p0 * Q1 + p1 * Q0 + p1 * Q1
    U1 = 1 + j / (r + 1) + j * y / r
    U0 = (N - 2 * j + 3 + (j - 1) * y) / (j + 1) + j * y / r
    gap = 2 * p1 * c0 - 3 * a * R1
    return ((j + 1) * (
        1.5 * p0 * R1 + p0 * U1 * gap / (2 * p1)
        + A1 * (U0 + U1)
    ) + remainder)


def main(max_N=120):
    for j in (4, 5):
        best = {"linear_coarse_low": None, "linear_high": None}
        negatives = {name: 0 for name in best}
        positive_R_negatives = {name: 0 for name in best}
        positive_R_best = {name: None for name in best}
        cells = 0
        for N in range(13, max_N + 1):
            for h in range(1, (N - 1) // 2 + 1):
                B = N - 2 * h - 1
                if B <= 0:
                    continue
                edge_budget = N - 2 * h
                for d in range(1, edge_budget + 1):
                    S = N - d
                    top = comb(S, j)
                    if not top:
                        continue
                    for R in range(edge_budget - d + 1):
                        q, s = divmod(R, d)
                        center = (
                            (d - s) * path_floor(S - q, j - 1)
                            + s * path_floor(S - q - 1, j - 1)
                        )
                        balanced_cap = top / (top + center)
                        relative_cap = (
                            (S - j + 1) / (S - j + 1 + j * (d - j))
                            if d > j else 1.0
                        )
                        ycap = min(balanced_cap, relative_cap)
                        coarse_low = ((d - 1) * comb(d, 2) / B
                                      + (1 - (d - 1) / B) * B)
                        high = comb(edge_budget, 2)
                        q0 = lower(j, N, h, d, R, 0.0, ycap)
                        q1 = lower(j, N, h, d, R, 1.0, ycap)
                        q2 = lower(j, N, h, d, R, 2.0, ycap)
                        w2 = (q2 - 2 * q1 + q0) / 2
                        cells += 1
                        for name, W in (("linear_coarse_low", coarse_low),
                                        ("linear_high", high)):
                            value = lower(j, N, h, d, R, W, ycap) - w2 * W * W
                            record = (value, N, h, d, R, q, s, W, ycap,
                                      balanced_cap, relative_cap, center)
                            if best[name] is None or record < best[name]:
                                best[name] = record
                            if value < -1e-5:
                                negatives[name] += 1
                                if R > 0:
                                    positive_R_negatives[name] += 1
                            if R > 0 and (positive_R_best[name] is None
                                          or record < positive_R_best[name]):
                                positive_R_best[name] = record
        print("j", j, "cells", cells, flush=True)
        for name in best:
            print(name, "negative", negatives[name], "minimum", best[name],
                  "positive_R_negative", positive_R_negatives[name],
                  "positive_R_minimum", positive_R_best[name], flush=True)


if __name__ == "__main__":
    main()
