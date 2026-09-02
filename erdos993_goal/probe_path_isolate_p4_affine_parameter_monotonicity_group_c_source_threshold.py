#!/usr/bin/env python3
"""Search an exact coefficientwise-positive threshold for group-c L.

If L becomes coefficientwise nonnegative after a fixed stable shift in
c, then all large-c exceptional cases are immediate and only finitely
many c-levels can require the utilization argument.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import T, V, m, x, z, w
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import c
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    group_increment,
    quotient,
)


C, M, X = sp.symbols("C M X")


def audit(parity: int) -> dict:
    d_expression, reserve_expression = group_increment(parity, "c")
    d_reduced = quotient(d_expression, T**3)
    reserve_reduced = quotient(reserve_expression, T**3)
    ell = quotient(d_reduced - reserve_reduced, V)
    stable = sp.Poly(
        sp.expand(ell.subs({m: M + 3, x: X})),
        z, w, c, M, X,
    )
    # Group the coefficients by every exponent except c.  Since L has
    # degree two in c, translation c=C+c0 is then an exact tiny binomial
    # transform instead of 32 repeated multivariate expansions.
    grouped: dict[tuple[int, int, int, int], dict[int, int]] = {}
    for exponent, coefficient in stable.terms():
        pz, pw, pc, pM, pX = map(int, exponent)
        grouped.setdefault((pz, pw, pM, pX), {})[pc] = int(coefficient)
    leading_c2 = [
        coefficients.get(2, 0) for coefficients in grouped.values()
        if coefficients.get(2, 0)
    ]
    records = []
    threshold = None
    for c0 in range(1, 33):
        coefficients = []
        for c_coefficients in grouped.values():
            maximum_degree = max(c_coefficients)
            for output_degree in range(maximum_degree + 1):
                value = sum(
                    coefficient
                    * math.comb(input_degree, output_degree)
                    * c0 ** (input_degree - output_degree)
                    for input_degree, coefficient in c_coefficients.items()
                    if input_degree >= output_degree
                )
                if value:
                    coefficients.append(value)
        record = {
            "c_shift": c0,
            "term_count": len(coefficients),
            "negative_coefficient_count": sum(
                1 for coefficient in coefficients if coefficient < 0
            ),
            "minimum_coefficient": int(min(coefficients)),
        }
        records.append(record)
        if record["negative_coefficient_count"] == 0:
            threshold = c0
            break
    return {
        "parity": parity,
        "stable_shift": "c=C+c0, m=M+3, x=X with C,M,X>=0",
        "leading_c2_term_count": len(leading_c2),
        "leading_c2_negative_coefficient_count": sum(
            1 for coefficient in leading_c2 if coefficient < 0
        ),
        "leading_c2_minimum_coefficient": min(leading_c2),
        "no_fixed_shift_can_be_coefficientwise_nonnegative": any(
            coefficient < 0 for coefficient in leading_c2
        ),
        "first_coefficientwise_nonnegative_c_shift": threshold,
        "records": records,
    }


def main() -> None:
    records = [audit(parity) for parity in (0, 1)]
    report = {
        "status": (
            "PROVED_NO_FIXED_GROUP_C_SOURCE_THRESHOLD"
            if all(record["no_fixed_shift_can_be_coefficientwise_nonnegative"]
                   for record in records)
            else "FOUND_GROUP_C_SOURCE_THRESHOLD"
            if all(record["first_coefficientwise_nonnegative_c_shift"] is not None
                   for record in records)
            else "NO_THRESHOLD_THROUGH_32"
        ),
        "records": records,
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "group_c_source_threshold_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
