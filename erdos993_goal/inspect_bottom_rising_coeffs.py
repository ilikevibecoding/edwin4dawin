#!/usr/bin/env python3
"""Inspect rising-factorial coefficients of the normalized Sturm sections."""

import sympy as sp

from verify_bottom_schur_two_sided_reverse_tp import cleared_catalan_basis
from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


Y = sp.symbols("y")


def rising_coefficients(polynomial: sp.Poly) -> list[sp.Expr]:
    degree = polynomial.degree()
    change = sp.Matrix(
        degree + 1,
        degree + 1,
        lambda power, index: sp.Poly(sp.rf(Y, index), Y).nth(power),
    )
    monomial = sp.Matrix([polynomial.nth(power) for power in range(degree + 1)])
    return list(change.inv() * monomial)


for d in (5, 8, 11):
    q = d - 1
    basis = cleared_catalan_basis(q)
    x = basis[0].gens[0]
    kernel = central_inverse_from_blocks(d).inv()
    reversal = reverse_identity(q)
    beta_y = sp.Matrix([p.as_expr().subs(x, Y) for p in basis])
    print(f"d={d}")
    for k in range(3, d + 3):
        beta_x = sp.Matrix(1, q, [p.eval(-k) for p in basis])
        value = sp.cancel((beta_x * kernel * reversal * beta_y)[0])
        forced = (
            sp.prod(Y + offset for offset in range(d - k + 7, d + 3))
            if k >= 4
            else sp.Integer(1)
        )
        sign = (-1) ** (k - 3 - (1 if k > (d + 1) // 3 + 2 else 0))
        polynomial = sp.Poly(sp.cancel(sign * value / forced), Y)
        coefficients = rising_coefficients(polynomial)
        common = sp.gcd_list([sp.numer(value) for value in coefficients])
        normalized = [sp.factor(value / common) for value in coefficients]
        print(f"  k={k}: {normalized}")
