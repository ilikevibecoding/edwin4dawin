#!/usr/bin/env python3
"""Explore the componentwise lower bound for forest q3 <= q2.

Diagnostic only.  For every integer partition of N, compute the constant and
linear parts of the exact component reduction, and test whether the positive
quadratic form is even needed after putting each u_i in its elementary box.
"""

from __future__ import annotations

from math import comb
from fractions import Fraction
import numpy as np
from scipy.optimize import minimize


def choose(n: int, r: int) -> int:
    return comb(n, r) if n >= r >= 0 else 0


def parts(n: int, lo: int = 1):
    if n == 0:
        yield ()
        return
    for first in range(lo, n + 1):
        for tail in parts(n - first, first):
            yield (first,) + tail


def data(a):
    n = sum(a)
    k = len(a)
    p = [x - 1 for x in a]
    b = [choose(x - 1, 2) for x in a]
    c = [choose(x - 1, 3) for x in a]
    big_b = sum(b)
    m = n - k
    d2 = choose(n, 2) - m
    c0 = choose(n, 3) - m * (n - 2) + big_b
    l0 = m * (n - 2) - 2 * big_b
    k0 = m * choose(n - 2, 2) - 2 * (big_b * (n - 4) + choose(m, 2)) + 3 * sum(c)
    m0 = 3 * c0 * l0 - 2 * d2 * k0
    ell = [6 * c0 - 3 * l0 - 2 * d2 * (2 * n - x - 3) for x in a]
    umax = [choose(x - 2, 2) for x in a]
    affine_box = m0 + sum(min(0, e * u) for e, u in zip(ell, umax))
    active = [(e, u) for e, u in zip(ell, umax) if u]
    scalar_min = Fraction(m0)
    scalar_arg = Fraction(0)
    if active and big_b:
        emin = min(e for e, _ in active)
        umax_total = sum(u for _, u in active)
        quad = Fraction(6 * (d2 - big_b), big_b)
        candidates = [Fraction(0), Fraction(umax_total)]
        if quad:
            vertex = Fraction(-emin, 2) / quad
            if 0 <= vertex <= umax_total:
                candidates.append(vertex)
        values = [(Fraction(m0) + emin * u + quad * u * u, u) for u in candidates]
        scalar_min, scalar_arg = min(values)
    return {
        "n": n,
        "k": k,
        "a": a,
        "B": big_b,
        "D2": d2,
        "C0": c0,
        "L0": l0,
        "K0": k0,
        "M0": m0,
        "ell": ell,
        "umax": umax,
        "affine_box": affine_box,
        "scalar_min": scalar_min,
        "scalar_arg": scalar_arg,
    }


def main():
    first_negative = None
    first_scalar_negative = None
    first_quadratic_negative = None
    global_quadratic_min = None
    min_affine = None
    min_ell = None
    for n in range(1, 21):
        count = 0
        for a in parts(n):
            count += 1
            row = data(a)
            if min_affine is None or row["affine_box"] < min_affine[0]:
                min_affine = (row["affine_box"], row)
            for idx, e in enumerate(row["ell"]):
                if min_ell is None or e < min_ell[0]:
                    min_ell = (e, idx, row)
            if row["affine_box"] < 0 and first_negative is None:
                first_negative = row
            if row["scalar_min"] < 0 and first_scalar_negative is None:
                first_scalar_negative = row
            active = [(e, b, cap) for e, b, cap in zip(row["ell"],
                      [choose(x - 1, 2) for x in row["a"]], row["umax"]) if cap]
            if active:
                ell_v = np.array([x[0] for x in active], dtype=float)
                b_v = np.array([x[1] for x in active], dtype=float)
                cap_v = np.array([x[2] for x in active], dtype=float)
                def objective(u):
                    return (row["M0"] + ell_v @ u
                            + 6 * row["D2"] * np.sum(u * u / b_v)
                            - 6 * np.sum(u) ** 2)
                def gradient(u):
                    return ell_v + 12 * row["D2"] * u / b_v - 12 * np.sum(u)
                starts = [np.zeros_like(cap_v), cap_v, cap_v / 2]
                results = [minimize(objective, x, jac=gradient, bounds=list(zip(np.zeros_like(cap_v), cap_v)),
                                    method="L-BFGS-B") for x in starts]
                best = min(results, key=lambda x: x.fun)
                qitem = (best.fun, row["a"], best.x, row)
                if global_quadratic_min is None or best.fun < global_quadratic_min[0]:
                    global_quadratic_min = qitem
                if best.fun < -1e-7 and first_quadratic_negative is None:
                    first_quadratic_negative = qitem
        print(n, count, "first_affine_negative", first_negative and first_negative["a"],
              "first_scalar_negative", first_scalar_negative and first_scalar_negative["a"], flush=True)
        if first_quadratic_negative:
            break
    print("min_affine", min_affine)
    print("min_ell", min_ell)
    print("first_negative", first_negative)
    print("first_scalar_negative", first_scalar_negative)
    print("global_quadratic_min", global_quadratic_min)
    print("first_quadratic_negative", first_quadratic_negative)


if __name__ == "__main__":
    main()
