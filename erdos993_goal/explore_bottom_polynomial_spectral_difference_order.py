#!/usr/bin/env python3
"""Search for a fixed low-order scalar difference operator for the tail family."""

from __future__ import annotations

import sympy as sp

from verify_bottom_schur_chebyshev_coefficients import X, maximal_tail_data


for d in range(5, 11):
    polynomials = [polynomial.as_expr() for polynomial in maximal_tail_data(d)[1]]
    family_size = len(polynomials)
    print(f"d={d}")
    for stencil_size in range(3, min(7, family_size)):
        shifts = [1 - index for index in range(stencil_size)]
        lambda_symbols = sp.symbols(f"l2:{stencil_size}")
        extra_symbols = sp.symbols(f"mu{stencil_size}:{family_size}")
        eigenvalues = [sp.Integer(0), sp.Integer(1), *lambda_symbols]
        equations = []
        for x_value in range(0, family_size + 2):
            system = sp.Matrix(
                stencil_size,
                stencil_size,
                lambda j, shift_index: polynomials[j].subs(
                    X, x_value + shifts[shift_index]
                ),
            )
            rhs = sp.Matrix(
                [
                    eigenvalues[j] * polynomials[j].subs(X, x_value)
                    for j in range(stencil_size)
                ]
            )
            coefficients = system.inv() * rhs
            for offset, polynomial in enumerate(polynomials[stencil_size:]):
                predicted = sp.factor(
                    sum(
                        coefficients[shift_index]
                        * polynomial.subs(X, x_value + shifts[shift_index])
                        for shift_index in range(stencil_size)
                    )
                    / polynomial.subs(X, x_value)
                )
                equations.append(predicted - extra_symbols[offset])
        unknowns = [*lambda_symbols, *extra_symbols]
        coefficient_matrix, rhs = sp.linear_eq_to_matrix(equations, unknowns)
        consistent = coefficient_matrix.rank() == coefficient_matrix.row_join(rhs).rank()
        print(
            f" stencil={stencil_size} (order {stencil_size - 1}): "
            f"consistent={consistent}"
        )
