#!/usr/bin/env python3
"""Probe d->d+3,a->a+1 after exact Bernstein degree elevation."""

import sympy as sp

from verify_bottom_barycentric_sturm_reduction import bernstein_coefficients, super_ballot
from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


T = sp.symbols("t")


def compressed(d: int) -> sp.Matrix:
    q = d - 1
    Tau = super_ballot(q)
    return sp.simplify(
        Tau * (central_inverse_from_blocks(d).inv() * reverse_identity(q)) * Tau.T
    )


def signed_bernstein(d: int, a: int, H: sp.Matrix) -> list[sp.Expr]:
    q = d - 1
    sign = 1 if 3 * a <= d - 2 else -1
    polynomial = sp.Poly(
        sign * sum((H[a, b] - H[a - 1, b]) * T**b for b in range(q)), T
    )
    return bernstein_coefficients(polynomial, d - 2)


def elevate_three(coefficients: list[sp.Expr]) -> list[sp.Expr]:
    degree = len(coefficients) - 1
    return [
        sp.factor(
            sum(
                coefficients[j]
                * sp.binomial(degree, j)
                * sp.binomial(3, k - j)
                / sp.binomial(degree + 3, k)
                for j in range(max(0, k - 3), min(degree, k) + 1)
            )
        )
        for k in range(degree + 4)
    ]


matrices = {d: compressed(d) for d in range(3, 19)}
for d in range(3, 16):
    for a in range(1, d - 1):
        if (d, a) == (4, 1):
            continue
        old = signed_bernstein(d, a, matrices[d])
        elevated = elevate_three(old)
        new = signed_bernstein(d + 3, a + 1, matrices[d + 3])
        first_scale = sp.factor(new[0] / elevated[0])
        last_scale = sp.factor(new[-1] / elevated[-1])
        first_rem = [sp.factor(x - first_scale * y) for x, y in zip(new, elevated)]
        last_rem = [sp.factor(x - last_scale * y) for x, y in zip(new, elevated)]
        first_signs = {sp.sign(x) for x in first_rem if x != 0}
        last_signs = {sp.sign(x) for x in last_rem if x != 0}
        ratios = [sp.factor(x / y) for x, y in zip(new, elevated)]
        monotone = all(ratios[k + 1] > ratios[k] for k in range(len(ratios) - 1))
        reverse = all(ratios[k + 1] < ratios[k] for k in range(len(ratios) - 1))
        print(
            f"({d},{a})->({d+3},{a+1}) first={first_signs} "
            f"last={last_signs} ratio_inc={monotone} ratio_dec={reverse}"
        )
