#!/usr/bin/env python3
"""Exact Sturm probe for the right-boundary polynomial family."""

from __future__ import annotations

import sympy as sp

from verify_bottom_derivative_completed_boundary_tn import (
    boundary_columns,
    cancellation_triangle,
)


X = sp.symbols("x")


def primitive_poly(coefficients):
    denominator = sp.ilcm(*[value.denominator for value in coefficients])
    integers = [int(value * denominator) for value in coefficients]
    common = sp.igcd(*integers)
    return sp.Poly(
        sum((value // common) * X**degree for degree, value in enumerate(integers)),
        X,
    )


def main() -> None:
    for m in range(2, 11):
        stages, _ = cancellation_triangle(m)
        columns = boundary_columns(stages, m)
        polynomials = [primitive_poly(column) for column in columns]
        assert [polynomial.degree() for polynomial in polynomials] == list(
            range(m + 2, 2 * m + 2)
        )
        assert all(
            sp.count_roots(polynomial, -sp.oo, 0) == polynomial.degree()
            for polynomial in polynomials
        )
        records = []
        for j, (lower, upper) in enumerate(zip(polynomials, polynomials[1:])):
            wronskian = sp.Poly(
                sp.diff(lower.as_expr(), X) * upper.as_expr()
                - lower.as_expr() * sp.diff(upper.as_expr(), X),
                X,
            )
            real_roots = sp.count_roots(wronskian, -sp.oo, sp.oo)
            sign_at_zero = sp.sign(wronskian.eval(0))
            records.append((j, int(real_roots), int(sign_at_zero)))
        print(f"m={m} adjacent_wronskians={records}", flush=True)


if __name__ == "__main__":
    main()
