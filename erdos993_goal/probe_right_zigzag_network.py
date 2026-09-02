#!/usr/bin/env python3
"""Probe the positive zigzag reconstruction of the reversed right factor."""

from __future__ import annotations

from fractions import Fraction as F
from itertools import combinations

import sympy as sp

from fast_bottom_forward import catalan
from verify_newton_checker_offdiag_homotopy import beta_checker_inverse
from probe_newton_full_neville_patterns import neville_parameters


def c(s: int) -> F:
    if s % 2:
        r = (s - 1) // 2
        return F(r + 1, r + 2)
    r = s // 2
    return F(r + 2, r + 1)


def build(q: int, target_order: str, reverse_k: bool = False):
    w = {}
    for s in range(q):
        w[q - 1, s] = [F(int(i == s)) for i in range(q)]
    w[q - 1, q] = [F(0) for _ in range(q)]
    for k in range(q - 2, -1, -1):
        for t in range(k, -1, -1):
            w[k, t] = [
                (a + b) / c(t + 1)
                for a, b in zip(w[k + 1, t + 1], w[k + 1, t + 2])
            ]
        w[k, k + 1] = [F(0) for _ in range(q)]
    cols = []
    labels = []
    for k in (range(q - 1, -1, -1) if reverse_k else range(q)):
        ts = (1, 0) if target_order == "10" else (0, 1)
        for t in ts:
            if t <= k:
                cols.append(w[k, t])
                labels.append((k, t))
    return [[cols[j][i] for j in range(len(cols))] for i in range(q)], labels


def audit(a):
    m, n = len(a), len(a[0])
    neg = []
    pos = zero = 0
    for k in range(1, min(m, n) + 1):
        for rr in combinations(range(m), k):
            for cc in combinations(range(n), k):
                d = sp.det(sp.Matrix([[sp.Rational(a[i][j].numerator, a[i][j].denominator) for j in cc] for i in rr]))
                if d < 0:
                    neg.append((rr, cc, d))
                    return pos, zero, neg
                if d:
                    pos += 1
                else:
                    zero += 1
    return pos, zero, neg


if __name__ == "__main__":
    for q in range(2, 8):
        for order, reverse_k in (("10", False), ("01", False), ("01", True), ("10", True)):
            a, labels = build(q, order, reverse_k)
            pos, zero, neg = audit(a)
            print(q, order, "revk", reverse_k, labels, "pos", pos, "zero", zero, "neg", neg[:1])

    q = 6
    v = beta_checker_inverse(q)
    # Coefficients of h_s obtained from the exact two-step recurrence.
    hs = [[F((-1) ** d * catalan(d + 2)) for d in range(q)]]
    hs.append(
        [F(0)]
        + [F((-1) ** (d + 1) * (catalan(d + 2) - 2 * catalan(d + 1))) for d in range(1, q)]
    )
    for s in range(1, q - 1):
        nxt = [F(0)] * q
        for d in range(q):
            nxt[d] = (c(s) * (hs[s - 1][d - 1] if d else F(0)) - hs[s][d])
        hs.append(nxt)
    kcore = [[sum(hs[s][d] * v[d][j] for d in range(q)) for s in range(q)] for j in range(q)]
    print("K rows coefficient-index, cols s")
    for row in kcore:
        print([str(x) for x in row])
    fwd, piv = neville_parameters(kcore)
    print("K fwd", [[(r, str(x)) for r, x in lev] for lev in fwd])
    print("K piv", [str(x) for x in piv])
