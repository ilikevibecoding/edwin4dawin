#!/usr/bin/env python3
"""Explore the universal reversed coefficient core for the group Q^2 endpoint."""

from __future__ import annotations

from math import comb

import sympy as sp

from fast_bottom_forward import catalan


def conv(a, b, limit):
    out = [0] * (limit + 1)
    for i, x in enumerate(a):
        for j, y in enumerate(b):
            if i + j <= limit:
                out[i + j] += x * y
    return out


def matrix(d: int, power: int = 2, limit: int | None = None):
    if limit is None:
        limit = d
    lim = limit + 5
    c = [catalan(i) for i in range(lim + 1)]
    c2 = conv(c, c, lim)
    # Sparse bivariate dictionary for K=(z+w)^2-z w C(z)^2 C(w)^2.
    k = {(2, 0): 1, (1, 1): 2, (0, 2): 1}
    for i in range(lim):
        for j in range(lim):
            k[i + 1, j + 1] = k.get((i + 1, j + 1), 0) - c2[i] * c2[j]
    poly = {(0, 0): 1}
    for _ in range(power):
        nxt = {}
        for (i, j), x in poly.items():
            for (a, b), y in k.items():
                if i + a <= limit and j + b <= limit:
                    nxt[i + a, j + b] = nxt.get((i + a, j + b), 0) + x * y
        poly = nxt
    e = d - 2 * power
    out = [[0] * (limit + 1) for _ in range(limit + 1)]
    for h in range(e + 1):
        weight = comb(e, h)
        for (i, j), x in poly.items():
            r, s = i + h, j + e - h
            if r <= limit and s <= limit:
                out[r][s] += weight * x
    return out


def schur_tail(a, d):
    whole = sp.Matrix(a)
    aa = whole[: d + 1, : d + 1]
    ab = whole[: d + 1, d + 1 :]
    ba = whole[d + 1 :, : d + 1]
    bb = whole[d + 1 :, d + 1 :]
    return sp.simplify(bb - ba * aa.inv() * ab)


def sign(x):
    return "+" if x > 0 else "-" if x < 0 else "."


if __name__ == "__main__":
    for d in range(5, 14, 2):
        a = matrix(d)
        core = [[a[i][d - j] for j in range(d + 1)] for i in range(d + 1)]
        print("d", d)
        for row in core:
            print("".join(sign(x) for x in row))
        print("rank", sp.Matrix(core).rank(), "det sign", sign(sp.det(sp.Matrix(core))))
        bottom = matrix(d, power=1)
        bcore = sp.Matrix([[bottom[i][d - j] for j in range(d + 1)] for i in range(d + 1)])
        diag = sp.diag(*[comb(d, i) for i in range(d + 1)])
        trial = bcore * diag.inv() * bcore
        diff = sp.Matrix(core) - trial
        print("L U^-1 L residual rank", diff.rank(), "nonzero", sum(int(x != 0) for x in diff))
        leftq = sp.simplify(bcore.inv() * sp.Matrix(core))
        rightq = sp.simplify(sp.Matrix(core) * bcore.inv())
        print("L^-1 G signs")
        for row in leftq.tolist():
            print("".join(sign(x) for x in row))
        print("G L^-1 signs")
        for row in rightq.tolist():
            print("".join(sign(x) for x in row))

    print("GROUP SCHUR TAILS")
    for m in range(1, 7):
        d = 2 * m + 5
        n = 3 * m + 5
        a = matrix(d, power=2, limit=n)
        sigma = schur_tail(a, d)
        reversed_tail = sigma[:, ::-1]
        print("m", m, "sign scalar", [[sign(x) for x in row] for row in reversed_tail.tolist()])
        print("det", sp.factor(reversed_tail.det()))
