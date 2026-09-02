#!/usr/bin/env python3
"""Factor sample Newton-coefficient polynomials for the general lift.

This exploratory script searches for a common algebraic shape behind
the exact coefficientwise-positive Newton expansions.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

import derive_path_isolate_layer_direct as direct
from stress_path_isolate_p4_general_layer_lift_newton import (
    internal_group,
)
from stress_path_isolate_polarization_grouping import (
    numeric_path_row_series,
)


CASES = (
    (0, 3, 0, 0),
    (1, 3, 0, 0),
    (0, 3, 1, 0),
    (0, 3, 0, 1),
    (0, 3, 2, 0),
    (2, 3, 0, 0),
    (0, 4, 0, 0),
    (1, 2, 1, 1),
)


def main() -> None:
    z = sp.symbols("z")
    original = direct.path_row_series
    direct.path_row_series = numeric_path_row_series
    records = []
    try:
        for c, m, x, parity in CASES:
            degree = 4 * c + 4 * m + 2 * x + 9 + 2 * parity
            values = [
                internal_group(c, m + 1, s, x, parity)
                - internal_group(c, m, s, x, parity)
                for s in range(-1, degree + 1)
            ]
            coefficients = []
            for _ in range(degree + 1):
                coefficients.append(values[0])
                values = [
                    values[index + 1] - values[index]
                    for index in range(len(values) - 1)
                ]
            polynomial = sum(
                coefficient * z**order
                for order, coefficient in enumerate(coefficients)
            )
            factored = sp.factor(polynomial)
            factor_list = sp.factor_list(polynomial)
            records.append(
                {
                    "c": c,
                    "m": m,
                    "x": x,
                    "parity_epsilon": parity,
                    "predicted_degree": degree,
                    "actual_degree": int(sp.degree(polynomial, z)),
                    "coefficient_gcd": int(
                        sp.gcd_list(coefficients)
                    ),
                    "factor_list": str(factor_list),
                    "factored": str(factored),
                }
            )
            print(
                f"case {(c,m,x,parity)}: "
                f"{factor_list}",
                flush=True,
            )
    finally:
        direct.path_row_series = original

    report = {
        "status": "PASS_EXPLORATORY_FACTORIZATION",
        "cases": records,
        "warning": "Exploratory exact factorizations only.",
    }
    Path(
        "path_isolate_p4_general_layer_lift_newton_factor_"
        "samples_20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
