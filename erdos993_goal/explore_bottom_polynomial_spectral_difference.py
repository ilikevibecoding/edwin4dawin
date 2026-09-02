#!/usr/bin/env python3
"""Test whether the one-sided tail polynomials share a second-order difference operator."""

from __future__ import annotations

import sympy as sp

from verify_bottom_schur_chebyshev_coefficients import X, maximal_tail_data


LAMBDA2 = sp.symbols("lambda2")

for d in range(5, 13):
    polynomials = [polynomial.as_expr() for polynomial in maximal_tail_data(d)[1]]
    candidate_lambdas = []
    valid = True
    inferred_lambda2 = None
    for x_value in range(0, 5):
        system = sp.Matrix(
            3,
            3,
            lambda j, shift: polynomials[j].subs(X, x_value + (1, 0, -1)[shift]),
        )
        rhs = sp.Matrix(
            [
                0,
                polynomials[1].subs(X, x_value),
                LAMBDA2 * polynomials[2].subs(X, x_value),
            ]
        )
        coefficients = sp.simplify(system.inv() * rhs)
        local = []
        for polynomial in polynomials[3:]:
            predicted = sp.factor(
                sum(
                    coefficients[shift]
                    * polynomial.subs(X, x_value + (1, 0, -1)[shift])
                    for shift in range(3)
                )
                / polynomial.subs(X, x_value)
            )
            local.append(predicted)
        candidate_lambdas.append(local)
    equations = []
    for j in range(len(polynomials) - 3):
        for x_index in range(1, len(candidate_lambdas)):
            equations.append(
                sp.factor(candidate_lambdas[x_index][j] - candidate_lambdas[0][j])
            )
    solutions = sp.solve(equations, [LAMBDA2], dict=True)
    if not solutions:
        valid = False
    else:
        inferred_lambda2 = solutions[0][LAMBDA2]
        valid = all(
            sp.factor(equation.subs(LAMBDA2, inferred_lambda2)) == 0
            for equation in equations
        )
    print(f"d={d}: second_order_difference={valid}, lambda2={inferred_lambda2}")
