#!/usr/bin/env python3
"""Fast general-root diagnostic for Newton m=1 at j=3."""

from __future__ import annotations

import numpy as np

import scan_terminal_q3_low_newton_m1_root_partition_fast_agent as base


def main():
    j = 3
    minimum = None
    for N in range(16, 151):
        r = N - j
        for d in range(1, N):
            S = N - d
            R = np.arange(1, S + 1, dtype=np.float64)
            blo = np.full(R.shape, base.c2(d - 1), dtype=np.float64)
            bhi = blo + base.c2(R) + base.c2(S - R)
            y_max = min(1.0, S / d)
            for y in (0.0, y_max):
                for endpoint, B2 in (("lo", blo), ("hi", bhi)):
                    at_zero = base.gaps(j, r, d, R, B2, np.zeros(R.shape), y)[0]
                    at_upper = base.gaps(
                        j, r, d, R, B2, (N - 3) * B2 / 3, y
                    )[0]
                    values = np.minimum(at_zero, at_upper)
                    index = int(np.argmin(values))
                    value = float(values[index])
                    record = (
                        value, N, d, index + 1, y, endpoint,
                        float(at_zero[index]), float(at_upper[index]),
                    )
                    if minimum is None or value < minimum[0]:
                        minimum = record
                    if value < -1e-6:
                        print("first_negative", record)
                        return
    print("minimum", minimum)


if __name__ == "__main__":
    main()
