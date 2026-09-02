#!/usr/bin/env python3
"""Probe endpoint square propagation for the original j-aggregation.

The original weighted endpoint is

  U_lambda^r (D + r R),

whereas the earlier endpoint probe used the V-reaggregated sequence and
the lambda-dependent bounded base U_lambda L+R.  The original sequence
has the newly observed symmetric-Pascal single-valley utilization, and
its bounded endpoint base D is independent of lambda.  This script
tests whether that alternative has cleaner square-entry geometry.
"""

from __future__ import annotations

import functools
import json
from pathlib import Path

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import T, m, q, x
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import c, to_sparse
from analyze_path_isolate_p4_group_grouped_tail_symbolic import reciprocal
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    bottom_increment,
    group_increment,
)
from probe_path_isolate_p4_affine_parameter_monotonicity_endpoint_southwest_entry import (
    A,
    S,
    add_scaled,
    evaluate,
    multiply,
    power,
)


@functools.cache
def original_endpoint_sources(
    package: str, parity: int, coordinate: str, denominator: int
):
    d_expression, reserve_expression = (
        group_increment(parity, coordinate)
        if package == "group"
        else bottom_increment(parity, coordinate)
    )
    base_sparse = to_sparse(denominator * d_expression)
    reserve_sparse = to_sparse(denominator * reserve_expression)
    base_reciprocal, base_degree = reciprocal(base_sparse)
    reserve_reciprocal, reserve_degree = reciprocal(reserve_sparse)
    assert base_degree == reserve_degree
    return base_reciprocal, reserve_reciprocal, base_degree


def audit_case(
    package, parity, coordinate, c_value, m_value, x_value,
    numerator, denominator, maximum_r,
):
    base_source, reserve_source, kernel_degree = original_endpoint_sources(
        package, parity, coordinate, denominator
    )
    a = (
        2 * c_value + m_value + x_value - 3
        if package == "group"
        else m_value + x_value - 3
    )
    b = (
        2 * m_value + parity - 4
        if package == "group"
        else 2 * m_value + parity - 5
    )
    fixed_target = (
        a + 2 * b + kernel_degree
        - (m_value + 5 + int(coordinate == "m"))
    )
    base_poly = evaluate(base_source, c_value, m_value, x_value, fixed_target)
    reserve_poly = evaluate(reserve_source, c_value, m_value, x_value, fixed_target)
    for factor, exponent in ((A, a), (S, b)):
        factor_power = power(factor, exponent, fixed_target)
        base_poly = multiply(base_poly, factor_power, fixed_target)
        reserve_poly = multiply(reserve_poly, factor_power, fixed_target)
    w_lambda = {
        (1, 0): numerator,
        (0, 1): denominator,
        (1, 1): denominator,
    }
    entry_order = None
    central_failures = []
    negative_counts = []
    last_negative_layer = None
    for r_value in range(maximum_r + 1):
        combined = add_scaled(base_poly, reserve_poly, r_value)
        central = combined.get((fixed_target, fixed_target), 0)
        if central < 0:
            central_failures.append({"r": r_value, "value": central})
        negatives = [
            (position, value) for position, value in combined.items() if value < 0
        ]
        negative_counts.append(len(negatives))
        if negatives:
            position, value = min(negatives, key=lambda item: item[1])
            last_negative_layer = {
                "r": r_value,
                "count": len(negatives),
                "minimum_position": list(position),
                "minimum_value": value,
            }
        else:
            entry_order = r_value
            break
        base_poly = multiply(base_poly, w_lambda, fixed_target)
        reserve_poly = multiply(reserve_poly, w_lambda, fixed_target)
    return {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "c": c_value if package == "group" else None,
        "m": m_value,
        "x": x_value,
        "lambda": f"{numerator}/{denominator}",
        "maximum_r": maximum_r,
        "fixed_reciprocal_target": fixed_target,
        "entry_order": entry_order,
        "negative_counts": negative_counts,
        "last_negative_layer": last_negative_layer,
        "pre_entry_central_failure_count": len(central_failures),
        "first_pre_entry_central_failures": central_failures[:10],
    }


def main() -> None:
    cases = []
    for endpoint in ((2, 3), (3, 2)):
        cases.extend(
            [
                ("group", 0, "m", 1, 12, 24, *endpoint, 40),
                ("bottom", 1, "x", 0, 12, 24, *endpoint, 40),
                ("group", 0, "m", 1, 12, 96, *endpoint, 40),
                ("bottom", 1, "x", 0, 12, 96, *endpoint, 40),
            ]
        )
    records = []
    for case in cases:
        record = audit_case(*case)
        records.append(record)
        print(
            record["package"], record["m"], record["x"], record["lambda"],
            record["entry_order"], record["pre_entry_central_failure_count"],
            flush=True,
        )
    report = {
        "status": "ORIGINAL_ENDPOINT_SOUTHWEST_ENTRY_PROBE",
        "case_count": len(records),
        "records": records,
        "warning": "Finite parameter points; order propagation after square entry is exact.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "original_endpoint_southwest_entry_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
