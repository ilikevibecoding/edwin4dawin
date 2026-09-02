#!/usr/bin/env python3
"""Adversarial fixed-j=4 scan with the exact root-only avoidance cap."""

from __future__ import annotations

from math import comb

import numpy as np

import scan_terminal_q3_low_newton_m1_root_partition_fast_agent as base


def main():
    j = 4
    minimum = None
    for N in range(15, 151):
        r = N - j
        for d in range(1, N):
            S = N - d
            R = np.arange(1, S + 1, dtype=np.float64)
            blo = np.full(R.shape, base.c2(d - 1), dtype=np.float64)
            bhi = blo + base.c2(R) + base.c2(S - R)
            if d < 4:
                ymax = 1.0
            else:
                hs = comb(S, 4) if S >= 4 else 0
                roots = comb(d, 4)
                ymax = hs / (hs + roots)
            for y in (0.0, ymax):
                for endpoint, B2 in (("lo", blo), ("hi", bhi)):
                    tau = (N - 3) * B2 / 3
                    values = base.gaps(j, r, d, R, B2, tau, y)[0]
                    index = int(np.argmin(values))
                    value = float(values[index])
                    record = (value, N, d, index + 1, y, endpoint)
                    if minimum is None or value < minimum[0]:
                        minimum = record
                    if value < -1e-5:
                        print("first_negative", record)
                        return
    print("minimum", minimum)


if __name__ == "__main__":
    main()
