#!/usr/bin/env python3
"""Neville reconnaissance for the group endpoint monomial coefficient matrix."""

from __future__ import annotations

import sympy as sp

from probe_group_as_bottom_difference import bottom, x, y


def neville(a: sp.Matrix):
    work = a.copy()
    rows, cols = work.shape
    params = []
    for c in range(min(rows - 1, cols)):
        level = []
        for r in range(rows - 1, c, -1):
            den = work[r - 1, c]
            if den == 0:
                level.append((r, None))
                continue
            mu = sp.cancel(work[r, c] / den)
            level.append((r, mu))
            for j in range(c, cols):
                work[r, j] = sp.cancel(work[r, j] - mu * work[r - 1, j])
        params.append(level)
    return params, [work[i, i] for i in range(min(rows, cols))]


if __name__ == "__main__":
    for m in range(1, 11):
        N, d = 3 * m + 4, 2 * m + 5
        pre = sp.expand(bottom(N + 1, d) - bottom(N, d - 2))
        post = sp.diff(pre, x, y)
        poly = sp.Poly(post, x, y)
        dx, dy = sp.degree(post, x), sp.degree(post, y)
        raw = sp.Matrix(
            [[poly.coeff_monomial(x**i * y**j) for j in range(dy + 1)] for i in range(dx + 1)]
        )
        matrix = raw[:, ::-1]
        forward, pivots = neville(matrix)
        transpose, tpivots = neville(matrix.T)
        fvals = [v for level in forward for _, v in level if v is not None]
        tvals = [v for level in transpose for _, v in level if v is not None]
        print(
            "m", m, "shape", matrix.shape,
            "f", len(fvals), min(fvals) if fvals else None,
            "t", len(tvals), min(tvals) if tvals else None,
            "pivots", min(pivots), min(tpivots),
            flush=True,
        )
        if m <= 2:
            print(" forward", [[(r, v) for r, v in level] for level in forward], flush=True)
