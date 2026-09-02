#!/usr/bin/env python3
"""Test whether absorbing the outer T^b factor repairs source signs.

The deweighted quotient uses sources U=-(1+z)L and W=T^2Q under the
common outer factor A^a T^b.  Since T=z+w is coefficientwise positive,
we may absorb T^b into both sources and leave the smaller outer factor
A^a.  This probe performs the smoothing sparsely and exactly, avoiding
the very large symbolic expansion of T^b U.
"""

from __future__ import annotations

from collections import defaultdict
import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import T, V, m, q, w, x, z
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import c
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    bottom_increment,
    group_increment,
    quotient,
)


def coefficient_map(expression: sp.Expr) -> dict[tuple[int, int], int]:
    return {
        (int(pz), int(pw)): int(value)
        for (pz, pw), value in sp.Poly(sp.expand(expression), z, w).terms()
        if value
    }


def multiply_by_T(source: dict[tuple[int, int], int]) -> dict[tuple[int, int], int]:
    result: dict[tuple[int, int], int] = defaultdict(int)
    for (pz, pw), value in source.items():
        result[pz + 1, pw] += value
        result[pz, pw + 1] += value
    return {atom: value for atom, value in result.items() if value}


def sign_summary(source: dict[tuple[int, int], int]) -> dict:
    values = list(source.values())
    return {
        "term_count": len(values),
        "negative_count": sum(value < 0 for value in values),
        "positive_count": sum(value > 0 for value in values),
        "minimum": min(values),
        "maximum": max(values),
    }


def audit_case(package, parity, coordinate, c_value, m_value, x_value):
    d_expression, reserve_expression = (
        group_increment(parity, coordinate)
        if package == "group"
        else bottom_increment(parity, coordinate)
    )
    common = T**3 if package == "group" else q**2 * T**3
    d_reduced = quotient(d_expression, common)
    denominator = quotient(reserve_expression, common)
    ell = quotient(d_reduced - denominator, V)
    numerator = sp.expand(-(1 + z) * ell)
    substitutions = {m: m_value, x: x_value}
    if package == "group":
        substitutions[c] = c_value
    numerator_sparse = coefficient_map(numerator.subs(substitutions))
    denominator_sparse = coefficient_map(denominator.subs(substitutions))
    b = (
        2 * m_value + parity - 1
        if package == "group"
        else 2 * m_value + parity - 2
    )

    checkpoints = {0, 1, 2, 3, 4, b // 4, b // 2, 3 * b // 4, b}
    smoothing = []
    first_nonnegative_step = None
    first_support_contained_step = None
    for step in range(b + 1):
        if first_nonnegative_step is None and all(
            value >= 0 for value in numerator_sparse.values()
        ):
            first_nonnegative_step = step
        if first_support_contained_step is None and set(numerator_sparse) <= set(
            denominator_sparse
        ):
            first_support_contained_step = step
        if step in checkpoints:
            summary = sign_summary(numerator_sparse)
            summary.update(
                {
                    "T_power": step,
                    "numerator_only_atom_count": len(
                        set(numerator_sparse) - set(denominator_sparse)
                    ),
                    "denominator_negative_count": sum(
                        value < 0 for value in denominator_sparse.values()
                    ),
                }
            )
            smoothing.append(summary)
        if step < b:
            numerator_sparse = multiply_by_T(numerator_sparse)
            denominator_sparse = multiply_by_T(denominator_sparse)

    final_summary = sign_summary(numerator_sparse)
    final_summary.update(
        {
            "numerator_only_atom_count": len(
                set(numerator_sparse) - set(denominator_sparse)
            ),
            "denominator_negative_count": sum(
                value < 0 for value in denominator_sparse.values()
            ),
        }
    )
    return {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "c": c_value if package == "group" else None,
        "m": m_value,
        "x": x_value,
        "outer_T_power": b,
        "first_coefficientwise_nonnegative_step": first_nonnegative_step,
        "first_support_contained_step": first_support_contained_step,
        "checkpoints": smoothing,
        "fully_smoothed": final_summary,
    }


def main() -> None:
    cases = [
        ("group", 0, "m", 1, 16, 40),
        ("bottom", 1, "x", 0, 20, 40),
        ("group", 0, "c", 1, 60, 120),
    ]
    records = []
    for case in cases:
        record = audit_case(*case)
        records.append(record)
        print(
            record["package"],
            record["coordinate"],
            record["m"],
            record["fully_smoothed"],
            flush=True,
        )
    repaired = all(
        not record["fully_smoothed"]["negative_count"]
        and not record["fully_smoothed"]["numerator_only_atom_count"]
        for record in records
    )
    report = {
        "status": (
            "PASS_T_SMOOTHING_GIVES_POSITIVE_COMMON_SOURCE"
            if repaired
            else "T_SMOOTHING_DOES_NOT_UNIFORMLY_REPAIR_SOURCE"
        ),
        "case_count": len(records),
        "records": records,
        "warning": "Finite exact source audit only.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "T_smoothed_sources_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
