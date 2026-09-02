#!/usr/bin/env python3
"""Exact Sturm audit for the degree-cancelled selected polynomial hierarchy.

This is reconnaissance for a possible polynomial-basis proof.  It also
records the exact obstruction to the simpler claim that adjacent raw
polynomials are in common proper position.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from fast_bottom_forward import polynomial_coefficient_matrix


OUT = Path("bottom_selected_sturm_hierarchy_certificate_20260803.json")
X = sp.symbols("x")


def primitive_poly(coefficients):
    denominator = sp.ilcm(*[value.denominator for value in coefficients])
    return sp.Poly(
        sum(int(value * denominator) * X**degree for degree, value in enumerate(coefficients)),
        X,
    )


def main() -> None:
    hierarchy_records = []
    polynomial_checks = 0
    coefficient_checks = 0
    for m in range(1, 11):
        q = 2 * m + 2
        coefficient_matrix = polynomial_coefficient_matrix(q)
        current = [
            [coefficient_matrix[degree][column] for degree in range(q)]
            for column in range(q - m, q)
        ]
        stages = []
        for stage in range(m):
            stage_coefficients = 0
            for coefficients in current:
                assert all(value > 0 for value in coefficients)
                polynomial = primitive_poly(coefficients)
                assert sp.count_roots(polynomial, -sp.oo, 0) == polynomial.degree()
                assert sp.count_roots(polynomial, 0, sp.oo) == 0
                polynomial_checks += 1
                coefficient_checks += len(coefficients)
                stage_coefficients += len(coefficients)
            stages.append(
                {
                    "stage": stage,
                    "polynomials": len(current),
                    "degree": len(current[0]) - 1,
                    "positive_coefficients": stage_coefficients,
                }
            )
            following = []
            for left, right in zip(current, current[1:]):
                multiplier = right[-1] / left[-1]
                reduced = [
                    multiplier * left[degree] - right[degree]
                    for degree in range(len(left) - 1)
                ]
                following.append(reduced)
            current = following
        hierarchy_records.append({"m": m, "stages": stages})
        print(f"m={m} exact_sturm_stages={m}", flush=True)

    # The raw adjacent family is not a common-interlacing/proper-position
    # chain.  At m=4 each adjacent Wronskian has two negative roots.
    m = 4
    q = 2 * m + 2
    coefficient_matrix = polynomial_coefficient_matrix(q)
    raw = [
        primitive_poly([coefficient_matrix[degree][column] for degree in range(q)])
        for column in range(q - m, q)
    ]
    wronskian_records = []
    for column, (left, right) in enumerate(zip(raw, raw[1:]), start=q - m):
        wronskian = sp.Poly(
            sp.diff(left.as_expr(), X) * right.as_expr()
            - left.as_expr() * sp.diff(right.as_expr(), X),
            X,
        )
        negative_roots = sp.count_roots(wronskian, -sp.oo, 0)
        assert negative_roots == 2
        wronskian_records.append(
            {
                "left_column": column,
                "right_column": column + 1,
                    "degree": int(wronskian.degree()),
                    "negative_roots": int(negative_roots),
            }
        )

    report = {
        "kind": "bottom_selected_sturm_hierarchy_certificate",
        "status": "PASS_EXACT_SELECTED_STURM_HIERARCHY_AUDIT",
        "range": [1, 10],
        "negative_rooted_polynomials": polynomial_checks,
        "positive_coefficients": coefficient_checks,
        "hierarchy_records": hierarchy_records,
        "raw_common_interlacing_obstruction_m4": wronskian_records,
        "scope": (
            "The hierarchy audit is finite evidence.  The Wronskian root "
            "counts are an exact obstruction to the naive raw common-"
            "interlacing argument, not to a more refined hierarchy theorem."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])


if __name__ == "__main__":
    main()
