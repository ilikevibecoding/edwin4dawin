#!/usr/bin/env python3
"""Probe reciprocal square entry for bottom-pair parameter increments."""

from __future__ import annotations

import json

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import (
    A as A_expr,
    T,
    V,
    load_bottom,
    q,
    x,
)
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import to_sparse
from analyze_path_isolate_p4_group_grouped_tail_symbolic import reciprocal
from probe_path_isolate_p4_affine_target_rows import multiply, power
from probe_path_isolate_p4_bottom_pair_affine_parameter_monotonicity import POINTS
from probe_path_isolate_p4_group_affine_parameter_monotonicity_square_entry import (
    shift_q,
)
from probe_path_isolate_p4_group_affine_southwest_square_entry import (
    A,
    S,
    W,
    add_scaled,
    evaluate,
)


def target(parity: int, point: tuple[int, int]) -> int:
    m_value, x_value = point
    return 4 * m_value + x_value + 2 * parity + 8


def full_values(source, parity: int, point: tuple[int, int], cap: int):
    m_value, x_value = point
    result = evaluate(source, 0, m_value, x_value, cap)
    for factor, exponent in (
        (A, m_value + x_value - 3),
        (S, 2 * m_value + parity - 5),
    ):
        result = multiply(result, power(factor, exponent, cap), cap)
    return result


def main() -> None:
    maximum_r = 70
    records = []
    for parity in (0, 1):
        constant, slope = load_bottom(parity)
        kernel = sp.Poly(sp.cancel((constant - slope) / (q**2 * T**3)), x)
        affine = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        p_reciprocal, p_degree = reciprocal(
            to_sparse(sp.expand(slope * A_expr))
        )
        b_reciprocal, b_degree = reciprocal(
            to_sparse(sp.expand(q**2 * T**3 * affine * V + slope * A_expr))
        )
        assert p_degree == b_degree == 26
        for point in POINTS:
            m_value, x_value = point
            for coordinate, adjacent, delta in (
                ("x", (m_value, x_value + 1), 1),
                ("m", (m_value + 1, x_value), 4),
            ):
                cap = target(parity, adjacent)
                base_b = full_values(b_reciprocal, parity, point, cap)
                base_p = full_values(p_reciprocal, parity, point, cap)
                adjacent_b = full_values(
                    b_reciprocal, parity, adjacent, cap
                )
                adjacent_p = full_values(
                    p_reciprocal, parity, adjacent, cap
                )
                increment_b = add_scaled(
                    adjacent_b, shift_q(base_b, delta, cap), -1
                )
                increment_p = add_scaled(
                    adjacent_p, shift_q(base_p, delta, cap), -1
                )
                reserve_negative_count = sum(
                    value < 0 for value in increment_p.values()
                )
                entry_order = None
                central_failures = []
                negative_counts = []
                for r in range(maximum_r + 1):
                    combined = add_scaled(increment_b, increment_p, r)
                    central = combined.get((cap, cap), 0)
                    if central < 0:
                        central_failures.append({"r": r, "value": central})
                    negative_count = sum(
                        value < 0 for value in combined.values()
                    )
                    negative_counts.append(negative_count)
                    if negative_count == 0:
                        entry_order = r
                        break
                    increment_b = multiply(increment_b, W, cap)
                    increment_p = multiply(increment_p, W, cap)
                record = {
                    "parity": parity,
                    "coordinate": coordinate,
                    "m": m_value,
                    "x": x_value,
                    "target_N": cap,
                    "target_shift": delta,
                    "reserve_negative_count": reserve_negative_count,
                    "entry_order": entry_order,
                    "pre_entry_central_failure_count": len(central_failures),
                    "first_central_failures": central_failures[:10],
                    "negative_counts": negative_counts,
                    "all_orders_certified": (
                        reserve_negative_count == 0
                        and entry_order is not None
                        and not central_failures
                    ),
                }
                records.append(record)
                print(
                    parity,
                    coordinate,
                    m_value,
                    x_value,
                    reserve_negative_count,
                    entry_order,
                    len(central_failures),
                    flush=True,
                )
    report = {
        "status": "PROBE",
        "parameter_point_count": len(POINTS),
        "comparison_count": len(records),
        "maximum_r": maximum_r,
        "reserve_failure_count": sum(
            record["reserve_negative_count"] for record in records
        ),
        "central_failure_count": sum(
            record["pre_entry_central_failure_count"] for record in records
        ),
        "not_entered_count": sum(
            record["entry_order"] is None for record in records
        ),
        "maximum_entry_order": max(
            (
                record["entry_order"]
                for record in records
                if record["entry_order"] is not None
            ),
            default=None,
        ),
        "all_orders_certified_for_sample": all(
            record["all_orders_certified"] for record in records
        ),
        "records": records,
        "warning": "Finite parameter evidence only.",
    }
    with open(
        "path_isolate_p4_bottom_pair_affine_parameter_monotonicity_"
        "square_entry_probe_20260801.json",
        "w",
        encoding="utf-8",
    ) as handle:
        json.dump(report, handle, indent=2)
        handle.write("\n")
    print(json.dumps({k: v for k, v in report.items() if k != "records"}, indent=2))


if __name__ == "__main__":
    main()
