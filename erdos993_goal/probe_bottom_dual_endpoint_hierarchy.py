#!/usr/bin/env python3
"""Exact Sturm probe for the low-degree endpoint-cancellation hierarchy."""

from __future__ import annotations

import sympy as sp

from fast_bottom_forward import polynomial_coefficient_matrix


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
    for m in range(1, 11):
        q = 2 * m + 2
        matrix = polynomial_coefficient_matrix(q)
        current = [
            [matrix[degree][column] for degree in range(q)]
            for column in range(q - m, q)
        ]
        checks = 0
        for stage in range(m):
            for coefficients in current:
                assert all(value > 0 for value in coefficients)
                polynomial = primitive_poly(coefficients)
                negative_roots = sp.count_roots(polynomial, -sp.oo, 0)
                if negative_roots != polynomial.degree():
                    print(
                        f"FAIL_ROOTED m={m} stage={stage} degree={polynomial.degree()} "
                        f"negative_roots={negative_roots}",
                        flush=True,
                    )
                    return
                checks += 1
            following = []
            for left, right in zip(current, current[1:]):
                multiplier = right[0] / left[0]
                reduced = [
                    right[degree] - multiplier * left[degree]
                    for degree in range(1, len(left))
                ]
                if not all(value > 0 for value in reduced):
                    first_bad = next(
                        degree for degree, value in enumerate(reduced) if value <= 0
                    )
                    print(
                        f"FAIL_COEFFICIENT m={m} stage={stage} index={first_bad}",
                        flush=True,
                    )
                    return
                following.append(reduced)
            current = following
        print(f"m={m} low_endpoint_negative_rooted={checks}", flush=True)


if __name__ == "__main__":
    main()
