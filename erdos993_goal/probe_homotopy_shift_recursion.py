#!/usr/bin/env python3
"""Probe whether the strict-upper homotopy coefficient nests in lower order."""

from __future__ import annotations

from fractions import Fraction as F

from fast_bottom_forward import matmul
from verify_newton_checker_offdiag_homotopy import constant_and_linear


def diagonally_equivalent(a, b):
    """Return row/column scalings if a = diag(x) b diag(y), else a witness."""
    n = len(a)
    x = [F(1) for _ in range(n)]
    y = [F(1) for _ in range(n)]
    # Fix each connected component by using the diagonal, which is nonzero for
    # every candidate lower-order triangular matrix.
    for i in range(n):
        if not b[i][i] or not a[i][i]:
            return False, ("zero diagonal", i, a[i][i], b[i][i])
        y[i] = a[i][i] / b[i][i]
    for i in range(n):
        for j in range(i, n):
            if a[i][j] != x[i] * b[i][j] * y[j]:
                # The simple x=1 gauge can miss an equivalence.  Compare the
                # invariant adjacent 2x2 cross ratios before rejecting.
                break
        else:
            continue
        break
    else:
        return True, (x, y)

    for i in range(n - 1):
        for j in range(i + 1, n - 1):
            if (
                a[i][j] * a[i + 1][j + 1] * b[i][j + 1] * b[i + 1][j]
                != b[i][j] * b[i + 1][j + 1] * a[i][j + 1] * a[i + 1][j]
            ):
                return False, (i, j)
    return False, "cross-ratios passed but scaling reconstruction not implemented"


def main():
    for q in range(3, 11):
        aq, bq = constant_and_linear(q)
        shifted = [[bq[i][j + 1] for j in range(q - 1)] for i in range(q - 1)]
        a, b = constant_and_linear(q - 1)
        full = [[a[i][j] + b[i][j] for j in range(q - 1)] for i in range(q - 1)]
        candidates = {"A": a, "full": full}
        print("q", q)
        for name, candidate in candidates.items():
            print(" ", name, diagonally_equivalent(shifted, candidate))


if __name__ == "__main__":
    main()
