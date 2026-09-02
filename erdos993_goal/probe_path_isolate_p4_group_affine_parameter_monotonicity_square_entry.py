#!/usr/bin/env python3
"""Probe reciprocal southwest-square entry for parameter increments."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import (
    A as A_expr,
    T,
    V,
    x,
    to_sparse,
)
from analyze_path_isolate_p4_group_grouped_tail_symbolic import reciprocal
from probe_path_isolate_p4_affine_target_rows import multiply, power
from probe_path_isolate_p4_group_affine_parameter_monotonicity import POINTS
from probe_path_isolate_p4_group_affine_southwest_square_entry import (
    A,
    S,
    W,
    add_scaled,
    evaluate,
)
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


def shift_q(source, amount: int, cap: int):
    return {
        (i + amount, j + amount): value
        for (i, j), value in source.items()
        if i + amount <= cap and j + amount <= cap
    }


def full_values(
    source,
    parity: int,
    point: tuple[int, int, int],
    cap: int,
):
    c_value, m_value, x_value = point
    result = evaluate(source, c_value, m_value, x_value, cap)
    a = 2 * c_value + m_value + x_value - 3
    b = 2 * m_value + parity - 4
    for factor, exponent in ((A, a), (S, b)):
        result = multiply(result, power(factor, exponent, cap), cap)
    return result


def target(parity: int, point: tuple[int, int, int]) -> int:
    c_value, m_value, x_value = point
    return 2 * c_value + 4 * m_value + x_value + 2 * parity + 8


def main() -> None:
    maximum_r = 60
    records = []
    for parity in (0, 1):
        constant, slope = split_sparse(
            Path(
                "path_isolate_p4_group_integrand_stable_"
                f"parity{parity}_terms_20260730.json"
            ),
            "zwcmsx",
        )
        kernel = sp.Poly(sp.cancel((constant - slope) / T**3), x)
        affine = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        p_reciprocal, p_degree = reciprocal(
            to_sparse(sp.expand(slope * A_expr))
        )
        b_reciprocal, b_degree = reciprocal(
            to_sparse(sp.expand(T**3 * affine * V + slope * A_expr))
        )
        assert p_degree == b_degree == 24
        for point in POINTS:
            c_value, m_value, x_value = point
            for coordinate, adjacent, delta in (
                ("x", (c_value, m_value, x_value + 1), 1),
                ("c", (c_value + 1, m_value, x_value), 2),
                ("m", (c_value, m_value + 1, x_value), 4),
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
                    central_value = combined.get((cap, cap), 0)
                    if central_value < 0:
                        central_failures.append(
                            {"r": r, "value": central_value}
                        )
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
                    "c": c_value,
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
                    c_value,
                    m_value,
                    x_value,
                    reserve_negative_count,
                    entry_order,
                    flush=True,
                )
    report = {
        "status": "PROBE",
        "identity": (
            "adjacent reciprocal full polynomial minus q^delta times "
            "the base full polynomial"
        ),
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
    Path(
        "path_isolate_p4_group_affine_parameter_monotonicity_"
        "square_entry_probe_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "records"}, indent=2))


if __name__ == "__main__":
    main()
