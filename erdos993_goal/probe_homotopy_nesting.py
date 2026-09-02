#!/usr/bin/env python3
"""Test diagonal/projective nesting of consecutive checker sandwiches."""

from __future__ import annotations

from fractions import Fraction as F

from verify_newton_checker_offdiag_homotopy import constant_and_linear


def value_pair(a, b):
    return (a, b)


def mul(x, y):
    return (x[0] * y[0], x[0] * y[1] + x[1] * y[0], x[1] * y[1])


def cross_pair(a, b, c, d):
    """Coefficients of a(t)b(t)c(t)d(t), used only for equality tests."""
    out = [F(1)]
    for p in (a, b, c, d):
        nxt = [F(0)] * (len(out) + 1)
        for i, x in enumerate(out):
            nxt[i] += x * p[0]
            nxt[i + 1] += x * p[1]
        out = nxt
    return out


def first_cross_ratio_failure(xa, xb, ya, yb):
    n = len(xa)
    for i in range(n - 1):
        for j in range(i + 1, n - 1):
            left = cross_pair(
                value_pair(xa[i][j], xb[i][j]),
                value_pair(xa[i + 1][j + 1], xb[i + 1][j + 1]),
                value_pair(ya[i][j + 1], yb[i][j + 1]),
                value_pair(ya[i + 1][j], yb[i + 1][j]),
            )
            right = cross_pair(
                value_pair(ya[i][j], yb[i][j]),
                value_pair(ya[i + 1][j + 1], yb[i + 1][j + 1]),
                value_pair(xa[i][j + 1], xb[i][j + 1]),
                value_pair(xa[i + 1][j], xb[i + 1][j]),
            )
            if left != right:
                return i, j
    return None


def main():
    for q in range(3, 11):
        a, b = constant_and_linear(q)
        aa, bb = constant_and_linear(q + 1)
        topa = [row[:q] for row in aa[:q]]
        topb = [row[:q] for row in bb[:q]]
        bota = [row[1:] for row in aa[1:]]
        botb = [row[1:] for row in bb[1:]]
        print(
            q,
            "top", first_cross_ratio_failure(a, b, topa, topb),
            "bottom", first_cross_ratio_failure(a, b, bota, botb),
        )


if __name__ == "__main__":
    main()
