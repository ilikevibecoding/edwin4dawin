#!/usr/bin/env python3
"""Print exact normalized negative-integer kernel evaluations for inspection."""

import sympy as sp

from verify_bottom_schur_two_sided_reverse_tp import cleared_catalan_basis
from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


Y = sp.symbols("y")


for d in range(3, 11):
    q = d - 1
    basis = cleared_catalan_basis(q)
    x = basis[0].gens[0]
    K = central_inverse_from_blocks(d).inv()
    J = reverse_identity(q)
    beta_y = sp.Matrix([p.as_expr().subs(x, Y) for p in basis])
    print(f"d={d}")
    for k in range(3, d + 3):
        beta_x = sp.Matrix(1, q, [p.eval(-k) for p in basis])
        value = sp.factor((beta_x * K * J * beta_y)[0])
        forced = (
            sp.prod(Y + offset for offset in range(d - k + 7, d + 3))
            if k >= 4
            else sp.Integer(1)
        )
        quotient = sp.factor(value / forced)
        sign = (-1) ** (k - 3 - (1 if k > (d + 1) // 3 + 2 else 0))
        primitive = sp.primitive(sp.Poly(sign * quotient, Y))[1]
        print(f"  k={k}: {sp.factor(primitive.as_expr())}")


def rising_coefficients(polynomial: sp.Poly, shift: sp.Rational) -> list[sp.Expr]:
    degree = polynomial.degree()
    change = sp.Matrix(
        degree + 1,
        degree + 1,
        lambda power, index: sp.Poly(sp.rf(Y + shift, index), Y).nth(power),
    )
    monomial = sp.Matrix([polynomial.nth(power) for power in range(degree + 1)])
    return list(change.inv() * monomial)


print("rising-basis sign audit through d=14")
for shift in [sp.Rational(n, 2) for n in range(0, 17)]:
    failures = []
    for d in range(3, 15):
        q = d - 1
        basis = cleared_catalan_basis(q)
        x = basis[0].gens[0]
        K = central_inverse_from_blocks(d).inv()
        J = reverse_identity(q)
        beta_y = sp.Matrix([p.as_expr().subs(x, Y) for p in basis])
        for k in range(3, d + 3):
            beta_x = sp.Matrix(1, q, [p.eval(-k) for p in basis])
            value = sp.cancel((beta_x * K * J * beta_y)[0])
            forced = (
                sp.prod(Y + offset for offset in range(d - k + 7, d + 3))
                if k >= 4
                else sp.Integer(1)
            )
            sign = (-1) ** (k - 3 - (1 if k > (d + 1) // 3 + 2 else 0))
            polynomial = sp.Poly(sp.cancel(sign * value / forced), Y)
            coefficients = rising_coefficients(polynomial, shift)
            if not all(coefficient > 0 for coefficient in coefficients):
                failures.append((d, k))
                break
        if failures:
            break
    print(f"  shift={shift}: first_failure={failures[0] if failures else None}")
