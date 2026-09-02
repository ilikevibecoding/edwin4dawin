#!/usr/bin/env python3
"""Search the possible interior vertex of the quadratic m=1 B2 bound."""

from __future__ import annotations

import numpy as np

import scan_terminal_q3_low_newton_m1_root_partition_fast_agent as base


def coupled_global(j, r, d, R, B2, y):
    N = j + r
    tau = (N - 3) * B2 / 3
    return base.gaps(j, r, d, R, B2, tau, y)[0]


def main():
    minimum = None
    positive_curvature_cells = 0
    interior_cells = 0
    for j in range(4, 26):
        for r in range(1, 51):
            N = j + r
            if N < 15:
                continue
            for d in range(1, N):
                S = N - d
                R = np.arange(1, S + 1, dtype=np.float64)
                blo = np.full(R.shape, base.c2(d - 1), dtype=np.float64)
                bhi = blo + base.c2(R) + base.c2(S - R)
                y_max = min(1.0, S / d)
                for y in (0.0, y_max):
                    midpoint = (blo + bhi) / 2
                    f0 = coupled_global(j, r, d, R, blo, y)
                    f1 = coupled_global(j, r, d, R, bhi, y)
                    fm = coupled_global(j, r, d, R, midpoint, y)
                    curvature = 2 * (f0 + f1 - 2 * fm)
                    linear = f1 - f0 - curvature
                    positive = curvature > 0
                    positive_curvature_cells += int(np.count_nonzero(positive))
                    with np.errstate(divide="ignore", invalid="ignore"):
                        vertex = np.where(positive, -linear / (2 * curvature), 0)
                    interior = positive & (vertex > 0) & (vertex < 1)
                    interior_cells += int(np.count_nonzero(interior))
                    clipped = np.clip(vertex, 0, 1)
                    Bvertex = blo + clipped * (bhi - blo)
                    fv = coupled_global(j, r, d, R, Bvertex, y)
                    candidates = np.minimum(np.minimum(f0, f1), fv)
                    index = int(np.argmin(candidates))
                    value = float(candidates[index])
                    record = (
                        value, j, r, d, index + 1, y,
                        float(blo[index]), float(bhi[index]),
                        float(vertex[index]), float(curvature[index]),
                    )
                    if minimum is None or value < minimum[0]:
                        minimum = record
                    if value < -1e-6:
                        print("first_negative", record)
                        return
    print("minimum", minimum)
    print("positive_curvature_cells", positive_curvature_cells)
    print("interior_vertex_cells", interior_cells)


if __name__ == "__main__":
    main()
