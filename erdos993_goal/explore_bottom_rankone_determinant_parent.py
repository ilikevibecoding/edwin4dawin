#!/usr/bin/env python3
"""Test the rank-one determinant parent for the bottom endpoint.

P(X,Y,z)=g(X+z)g(Y+z)-z^2 h(X+z)h(Y+z)/(d(d-1))
has d-th z derivative at zero equal to the bottom target.  Search for roots
with Im z>0 after fixing X,Y in the upper half-plane.
"""

from __future__ import annotations

import random

import numpy as np
import sympy as sp

from verify_umbral_hypergeometric_finite_free_structure import X, hypergeometric_form


Y, Z = sp.symbols("y z")


def shifted_coefficients(poly: sp.Poly, shift: complex) -> np.polynomial.Polynomial:
    base = np.polynomial.Polynomial([shift, 1.0])
    result = np.polynomial.Polynomial([0.0j])
    power = np.polynomial.Polynomial([1.0 + 0.0j])
    for coefficient in [complex(poly.nth(k)) for k in range(poly.degree() + 1)]:
        result = result + coefficient * power
        power = power * base
    return result


def parent_roots(g: sp.Poly, h: sp.Poly, d: int, x: complex, y: complex):
    gx = shifted_coefficients(g, x)
    gy = shifted_coefficients(g, y)
    hx = shifted_coefficients(h, x)
    hy = shifted_coefficients(h, y)
    z2 = np.polynomial.Polynomial([0.0, 0.0, 1.0 / (d * (d - 1))])
    parent = gx * gy - z2 * hx * hy
    coefficients = np.trim_zeros(parent.coef, "b")
    return np.polynomial.polynomial.polyroots(coefficients)


rng = random.Random(993_208_003)
for m in range(1, 9):
    N, d = 3 * m + 3, 2 * m + 3
    g_expr = sp.expand(hypergeometric_form(N, 3))
    h_expr = sp.expand(hypergeometric_form(N - 1, 3))
    g, h = sp.Poly(g_expr, X), sp.Poly(h_expr, X)

    parent = sp.expand(
        g_expr.subs(X, X + Z) * g_expr.subs(X, Y + Z)
        - Z**2 / sp.Integer(d * (d - 1))
        * h_expr.subs(X, X + Z) * h_expr.subs(X, Y + Z)
    )
    target = sp.expand(
        sum(
            sp.binomial(d, k) * sp.diff(g_expr, X, k) * sp.diff(g_expr, X, d - k).subs(X, Y)
            for k in range(d + 1)
        )
        - sum(
            sp.binomial(d - 2, k) * sp.diff(h_expr, X, k) * sp.diff(h_expr, X, d - 2 - k).subs(X, Y)
            for k in range(d - 1)
        )
    )
    assert sp.expand(sp.diff(parent, Z, d).subs(Z, 0) - target) == 0

    witness = None
    maximum_imaginary_root = -float("inf")
    for _ in range(500):
        x = rng.uniform(-100, 100) + 1j * 10 ** rng.uniform(-3, 2)
        y = rng.uniform(-100, 100) + 1j * 10 ** rng.uniform(-3, 2)
        roots = parent_roots(g, h, d, x, y)
        local = max(root.imag for root in roots)
        maximum_imaginary_root = max(maximum_imaginary_root, local)
        if local > 1e-7:
            root = max(roots, key=lambda value: value.imag)
            witness = (x, y, root)
            break
    print(
        f"m={m}, identity=True, max_imag_root={maximum_imaginary_root}, witness={witness}",
        flush=True,
    )
