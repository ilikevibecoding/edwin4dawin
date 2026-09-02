#!/usr/bin/env python3
"""Probe parent-child interlacing in the low-endpoint cancellation triangle."""

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


def wronskian_real_roots(lower, upper):
    wronskian = sp.Poly(
        sp.diff(lower.as_expr(), X) * upper.as_expr()
        - lower.as_expr() * sp.diff(upper.as_expr(), X),
        X,
    )
    return int(sp.count_roots(wronskian, -sp.oo, sp.oo)), int(
        sp.sign(wronskian.eval(0))
    )


def main() -> None:
    for m in range(2, 11):
        q = 2 * m + 2
        matrix = polynomial_coefficient_matrix(q)
        current = [
            [matrix[degree][column] for degree in range(q)]
            for column in range(q - m, q)
        ]
        records = []
        for stage in range(m - 1):
            following = []
            for index, (left, right) in enumerate(zip(current, current[1:])):
                multiplier = right[0] / left[0]
                child = [
                    right[degree] - multiplier * left[degree]
                    for degree in range(1, len(left))
                ]
                left_poly = primitive_poly(left)
                right_poly = primitive_poly(right)
                child_poly = primitive_poly(child)
                records.append(
                    {
                        "stage": stage,
                        "index": index,
                        "left_child": wronskian_real_roots(child_poly, left_poly),
                        "right_child": wronskian_real_roots(child_poly, right_poly),
                    }
                )
                following.append(child)
            current = following
        failures = [
            record
            for record in records
            if record["left_child"][0] or record["right_child"][0]
        ]
        print(
            f"m={m} parent_child_pairs={len(records)} failures={failures[:3]}",
            flush=True,
        )


if __name__ == "__main__":
    main()
