#!/usr/bin/env python3
"""Replay the one-step terminal-drift identities and graph counterexample."""

from __future__ import annotations

from fractions import Fraction
from math import comb

import sympy as sp


def main() -> int:
    r = sp.symbols("r", positive=True)
    k = r + 1
    bm, b, bp, cm, c = sp.symbols(
        "bm b bp cm c", positive=True
    )
    a = b + cm
    ap = bp + c
    u = r * b / bm
    v = k * ap / a

    cleared = sp.factor((u + 1 - v) * bm * a)
    displayed = (r * b + bm) * a - k * bm * ap
    assert sp.expand(cleared - displayed) == 0

    g_f = r * b**2 + bm * b - k * bm * bp
    terminal_form = g_f + cm * (r * b + bm) - k * bm * c
    assert sp.expand(displayed - terminal_form) == 0

    # Exact K_{2,10} failure.  Its independent sets lie entirely in one
    # of the two bipartition classes.
    B = [
        (comb(2, j) if j <= 2 else 0)
        + (comb(10, j) if j <= 10 else 0)
        - (1 if j == 0 else 0)
        for j in range(11)
    ]
    # Deleting q in the two-vertex class leaves K_{1,10}.
    C = [
        (comb(10, j) if j <= 10 else 0)
        + (1 if j == 1 else 0)
        for j in range(11)
    ]
    A = [
        B[j] + (C[j - 1] if j >= 1 else 0)
        for j in range(11)
    ]
    rr = 2
    uu = Fraction(rr * B[rr], B[rr - 1])
    vv = Fraction((rr + 1) * A[rr + 1], A[rr])
    assert uu == Fraction(23, 3)
    assert vv == Fraction(165, 19)
    assert uu + 1 - vv == Fraction(-1, 57)

    print("PASS: terminal one-step drift reduction")
    print("cleared drift =", displayed)
    print("K_2,10 gap =", uu + 1 - vv)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
