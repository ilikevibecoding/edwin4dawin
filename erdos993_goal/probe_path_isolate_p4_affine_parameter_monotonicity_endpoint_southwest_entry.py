#!/usr/bin/env python3
"""Probe fixed southwest-square entry for the two weighted endpoints."""

from __future__ import annotations

import functools
import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import (
    A as A_expr, T, V, m, q, w, x, z,
)
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import c, to_sparse
from analyze_path_isolate_p4_group_grouped_tail_symbolic import reciprocal
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    bottom_increment, group_increment, quotient,
)
from probe_path_isolate_p4_affine_target_rows import multiply, power
from probe_path_isolate_p4_group_affine_southwest_square_entry import (
    A, S, add_scaled, evaluate,
)


@functools.cache
def endpoint_sources(
    package: str, parity: int, coordinate: str, numerator: int, denominator: int
):
    d_expression, reserve_expression = (
        group_increment(parity, coordinate)
        if package == "group" else bottom_increment(parity, coordinate)
    )
    common = T**3 if package == "group" else q**2 * T**3
    d_reduced = quotient(d_expression, common)
    reserve_reduced = quotient(reserve_expression, common)
    ell = quotient(d_reduced - reserve_reduced, V)
    # denominator times the fixed-lambda base and reserve.  This is a
    # common positive scaling of U_lambda*L+R0 and R0.
    u_scaled = denominator * (1 + z) + numerator * w
    base = sp.expand(common * (u_scaled * ell + denominator * reserve_reduced))
    reserve = sp.expand(denominator * reserve_expression)
    base_sparse = to_sparse(base)
    reserve_sparse = to_sparse(reserve)
    base_reciprocal, base_degree = reciprocal(base_sparse)
    reserve_reciprocal, reserve_degree = reciprocal(reserve_sparse)
    assert base_degree == reserve_degree
    return base_reciprocal, reserve_reciprocal, base_degree


def audit_case(
    package: str, parity: int, coordinate: str, c_value: int,
    m_value: int, x_value: int, numerator: int, denominator: int,
    maximum_r: int = 80,
) -> dict:
    base_source, reserve_source, kernel_degree = endpoint_sources(
        package, parity, coordinate, numerator, denominator
    )
    a = (
        2 * c_value + m_value + x_value - 3
        if package == "group" else m_value + x_value - 3
    )
    b = (
        2 * m_value + parity - 4
        if package == "group" else 2 * m_value + parity - 5
    )
    fixed_target = (
        a + 2 * b + kernel_degree
        - (m_value + 5 + int(coordinate == "m"))
    )
    base_poly = evaluate(
        base_source, c_value, m_value, x_value, fixed_target
    )
    reserve_poly = evaluate(
        reserve_source, c_value, m_value, x_value, fixed_target
    )
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
    central_zeros = []
    negative_counts = []
    last_negative_layer = None
    for r_value in range(maximum_r + 1):
        combined = add_scaled(base_poly, reserve_poly, r_value)
        central = combined.get((fixed_target, fixed_target), 0)
        if central < 0:
            central_failures.append({"r": r_value, "value": central})
        elif central == 0:
            central_zeros.append(r_value)
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
                "minimum_distances_from_northeast": [
                    fixed_target - position[0], fixed_target - position[1]
                ],
                "first_positions": [list(item[0]) for item in negatives[:20]],
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
        "fixed_reciprocal_target": fixed_target,
        "kernel_bidegree": kernel_degree,
        "maximum_r": maximum_r,
        "entry_order": entry_order,
        "negative_counts": negative_counts,
        "last_negative_layer": last_negative_layer,
        "pre_entry_central_failure_count": len(central_failures),
        "first_pre_entry_central_failures": central_failures[:10],
        "pre_entry_central_zero_orders": central_zeros,
        "all_orders_certified": entry_order is not None and not central_failures,
    }


def main() -> None:
    records = []
    for parity in (0, 1):
        for coordinate in ("x", "c", "m"):
            for endpoint in ((2, 3), (3, 2)):
                record = audit_case(
                    "group", parity, coordinate, 1, 12, 24, *endpoint
                )
                records.append(record)
                print(
                    "group", parity, coordinate, record["lambda"],
                    record["entry_order"], record["pre_entry_central_failure_count"],
                    flush=True,
                )
        for coordinate in ("x", "m"):
            for endpoint in ((2, 3), (3, 2)):
                record = audit_case(
                    "bottom", parity, coordinate, 0, 12, 24, *endpoint
                )
                records.append(record)
                print(
                    "bottom", parity, coordinate, record["lambda"],
                    record["entry_order"], record["pre_entry_central_failure_count"],
                    flush=True,
                )
    report = {
        "status": "PASS_FINITE_ENDPOINT_SOUTHWEST_ENTRY"
        if all(record["all_orders_certified"] for record in records)
        else "FAIL",
        "case_count": len(records),
        "all_entered": all(record["entry_order"] is not None for record in records),
        "maximum_entry_order": max(
            (record["entry_order"] or 0) for record in records
        ),
        "pre_entry_central_failure_count": sum(
            record["pre_entry_central_failure_count"] for record in records
        ),
        "pre_entry_central_zero_count": sum(
            len(record["pre_entry_central_zero_orders"]) for record in records
        ),
        "records": records,
        "warning": "Finite parameter points; square propagation is exact in r.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_endpoint_"
        "southwest_entry_probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
