#!/usr/bin/env python3
"""Audit consecutive-order reserve crosses along the exact group-Q factors."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import A, T, V, q, w, z
from analyze_wide_target_blended_reserve_nyquist import reflected_cross
from analyze_original_reserve_pencil_crossings import product
from analyze_path_isolate_p4_affine_parameter_monotonicity_deweighted_third_convexity import (
    nonzero_sign_word,
)
from probe_exceptional_target_neighbor_reserve_crossings import multiply_binomial
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    aggregate,
    group_increment,
    quotient,
)


OUTPUT_PATH = Path(
    "path_isolate_p4_affine_parameter_monotonicity_"
    "group_reserve_factor_prefix_crosses_20260802.json"
)


def sparse(expression: sp.Expr):
    poly = sp.Poly(sp.expand(expression), z, w)
    return {(i, j, 0, 0, 0): int(value) for (i, j), value in poly.terms()}


def audit(source, m: int, x: int, r: int):
    # q^2 A^2 T^2 has already been absorbed into target, a, and b.
    a = m + x + 1
    b = 2 * m + 1
    target = m + r + 4
    current = aggregate(source, a, b, r, target, 0, 0, 0)
    previous = aggregate(source, a, b, r - 1, target - 1, 0, 0, 0)
    reference = multiply_binomial(previous, 1)
    cross = reflected_cross(current, reference)
    current_even = [value if j % 2 == 0 else -value for j, value in enumerate(current[0::2])]
    current_odd = [value if j % 2 == 0 else -value for j, value in enumerate(current[1::2])]
    reference_even = [value if j % 2 == 0 else -value for j, value in enumerate(reference[0::2])]
    reference_odd = [value if j % 2 == 0 else -value for j, value in enumerate(reference[1::2])]
    even_product = product(current_even, reference_even)
    odd_product = product(current_odd, reference_odd)
    real_numerator = [
        (even_product[j] if j < len(even_product) else 0)
        + (odd_product[j - 1] if 0 <= j - 1 < len(odd_product) else 0)
        for j in range(max(
            len(even_product),
            len(odd_product) + 1,
        ))
    ]
    return {
        "negative_count": sum(value < 0 for value in cross),
        "negative_indices": [j for j, value in enumerate(cross) if value < 0],
        "zero_count": sum(value == 0 for value in cross),
        "nonzero_sign_word": nonzero_sign_word(cross),
        "real_numerator_negative_count": sum(value < 0 for value in real_numerator),
        "real_numerator_zero_count": sum(value == 0 for value in real_numerator),
        "real_numerator_nonzero_sign_word": nonzero_sign_word(real_numerator),
        "minimum_sign": -1 if any(value < 0 for value in cross) else (1 if any(cross) else 0),
    }


def main() -> None:
    F = sp.expand(2 * A * (A - 1) + (V + 1) ** 2)
    G = sp.expand(A * T**2 - q)
    factors = [
        ("z_plus_w", z + w),
        ("quadratic", z**2 + w**2),
        ("F", F),
        ("G_first", G),
        ("G_second", G),
    ]
    expression = sp.Integer(1)
    prefixes = [("bare", sparse(expression))]
    for name, factor in factors:
        expression = sp.expand(expression * factor)
        prefixes.append((name, sparse(expression)))

    # Check the symbolic factorization against the actual hard group reserve.
    _, reserve = group_increment(0, "m")
    actual_q = quotient(quotient(reserve, T**3), T**2)
    assert sp.expand(actual_q - q**2 * A**2 * expression) == 0

    records = []
    for m in (6, 12, 24, 36):
        for ratio in (2, 4, 8):
            x = ratio * m
            for numerator, denominator in ((1, 1), (3, 2), (2, 1)):
                r = numerator * m // denominator
                stages = []
                for name, source in prefixes:
                    stages.append({"stage": name, **audit(source, m, x, r)})
                records.append({"m": m, "x": x, "r": r, "stages": stages})
    for m in (48, 60, 72, 96, 120):
        x, r = 2 * m, 2 * m
        stages = []
        for name, source in prefixes:
            stages.append({"stage": name, **audit(source, m, x, r)})
        records.append({"m": m, "x": x, "r": r, "stages": stages})
    failures = {}
    for name, _ in prefixes:
        failures[name] = sum(
            next(stage for stage in record["stages"] if stage["stage"] == name)["negative_count"] > 0
            for record in records
        )
    report = {
        "status": "GROUP_RESERVE_FACTOR_PREFIX_CROSS_AUDIT",
        "case_count": len(records),
        "failure_counts_by_stage": failures,
        "factor_identities": {
            "F": "2*A*(A-1)+(V+1)^2",
            "G": "A*T^2-z*w",
        },
        "records": records,
        "warning": "Finite exact coefficient evidence only.",
    }
    OUTPUT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
