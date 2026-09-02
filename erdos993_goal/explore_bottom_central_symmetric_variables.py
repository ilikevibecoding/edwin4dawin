#!/usr/bin/env python3
"""Express the central-form generating polynomial in s=u+v and p=uv."""

import sympy as sp

from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


U, V, S, P = sp.symbols("u v s p")


def symmetric_uv_to_sp(expression: sp.Expr, degree: int) -> sp.Expr:
    coefficients = sp.symbols(f"c0:{(degree + 1) * (degree + 2) // 2}")
    monomials = []
    for power_p in range(degree // 2 + 1):
        for power_s in range(degree - 2 * power_p + 1):
            monomials.append(S**power_s * P**power_p)
    unknowns = sp.symbols(f"a0:{len(monomials)}")
    candidate = sum(value * monomial for value, monomial in zip(unknowns, monomials))
    expanded = sp.Poly(candidate.subs({S: U + V, P: U * V}) - expression, U, V)
    solution = sp.solve(expanded.coeffs(), unknowns, dict=True)[0]
    return sp.factor(candidate.subs(solution))


for d in range(3, 13):
    q = d - 1
    form = central_inverse_from_blocks(d).inv() * reverse_identity(q)
    polynomial = sp.factor(
        sum(form[row, column] * U**row * V**column for row in range(q) for column in range(q))
    )
    converted = symmetric_uv_to_sp(polynomial, q - 1)
    coefficients = sp.Poly(converted, S, P).coeffs()
    print(f"d={d}: all_sp_coefficients_positive={all(value > 0 for value in coefficients)}")
    print(converted)
