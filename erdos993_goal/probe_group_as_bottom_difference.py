#!/usr/bin/env python3
"""Test the group endpoint before/after the D_X D_Y bottom-difference lift."""

from __future__ import annotations

import random

import numpy as np
import sympy as sp

from verify_umbral_hypergeometric_finite_free_structure import X, hypergeometric_form


x, y, t = sp.symbols("x y t")


def dsum(poly, order):
    return sp.expand(
        sum(sp.binomial(order, j) * sp.diff(poly, x, j, y, order - j) for j in range(order + 1))
    )


def bottom(N, d):
    g = hypergeometric_form(N, 3)
    h = hypergeometric_form(N - 1, 3)
    gg = g.subs(X, x) * g.subs(X, y)
    hh = h.subs(X, x) * h.subs(X, y)
    return sp.expand(dsum(gg, d) - dsum(hh, d - 2))


def real_rooted_on_line(poly, values):
    px = sp.Poly(sp.expand(poly.subs(values)), t)
    if px.degree() <= 1:
        return True, px.degree()
    coeffs = np.array([float(v) for v in px.all_coeffs()], dtype=float)
    coeffs /= np.max(np.abs(coeffs))
    roots = np.roots(coeffs)
    count = int(np.sum(np.abs(roots.imag) < 1e-7))
    return count == px.degree(), count


if __name__ == "__main__":
    rng = random.Random(20260803)
    for m in range(1, 8):
        N = 3 * m + 4
        d = 2 * m + 5
        pre = sp.expand(bottom(N + 1, d) - bottom(N, d - 2))
        post = sp.diff(pre, x, y)
        failures = {"pre": 0, "post": 0}
        witnesses = {}
        for trial in range(20):
            vals = {
                x: rng.randint(-25, 25) + rng.randint(1, 8) * t,
                y: rng.randint(-25, 25) + rng.randint(1, 8) * t,
            }
            for label, poly in (("pre", pre), ("post", post)):
                ok, count = real_rooted_on_line(poly, vals)
                if not ok:
                    failures[label] += 1
                    witnesses.setdefault(label, (vals, count, sp.Poly(poly.subs(vals), t).degree()))
        print(m, failures, witnesses)
