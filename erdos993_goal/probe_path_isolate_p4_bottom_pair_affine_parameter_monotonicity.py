#!/usr/bin/env python3
"""Exact central stress for bottom-pair affine m/x monotonicity."""

from __future__ import annotations

import json
from fractions import Fraction
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import (
    A as A_expr,
    T,
    V,
    load_bottom,
    m,
    q,
    x,
)
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import to_sparse
from probe_path_isolate_p4_affine_target_rows import (
    A,
    T as T_dict,
    V as V_dict,
    multiply,
    power,
)
from probe_path_isolate_p4_group_affine_southwest_square_entry import evaluate


POINTS = (
    (3, 0),
    (3, 12),
    (3, 24),
    (3, 48),
    (6, 12),
    (10, 24),
    (16, 40),
    (20, 40),
)


def values(
    parity: int,
    m_value: int,
    x_value: int,
    maximum_r: int,
    b_source,
    p_source,
):
    cap = m_value + maximum_r + 5
    b_poly = evaluate(b_source, 0, m_value, x_value, cap)
    p_poly = evaluate(p_source, 0, m_value, x_value, cap)
    for factor, exponent in (
        (A, m_value + x_value - 3),
        (T_dict, 2 * m_value + parity - 5),
    ):
        factor_power = power(factor, exponent, cap)
        b_poly = multiply(b_poly, factor_power, cap)
        p_poly = multiply(p_poly, factor_power, cap)
    result = {"base": [], "reserve": [], "combined": []}
    for r in range(maximum_r + 1):
        target = m_value + r + 5
        base = b_poly.get((target, target), 0)
        reserve = p_poly.get((target, target), 0)
        result["base"].append(base)
        result["reserve"].append(reserve)
        result["combined"].append(base + r * reserve)
        b_poly = multiply(b_poly, V_dict, cap)
        p_poly = multiply(p_poly, V_dict, cap)
    return result


def main() -> None:
    maximum_r = 50
    records = []
    failures = []
    worst_compensation = None
    for parity in (0, 1):
        constant, slope = load_bottom(parity)
        kernel = sp.Poly(sp.cancel((constant - slope) / (q**2 * T**3)), x)
        affine = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        p_source = to_sparse(sp.expand(slope * A_expr))
        b_source = to_sparse(
            sp.expand(q**2 * T**3 * affine * V + slope * A_expr)
        )
        cache = {}

        def get(point):
            if point not in cache:
                cache[point] = values(
                    parity, *point, maximum_r, b_source, p_source
                )
            return cache[point]

        for m_value, x_value in POINTS:
            base = get((m_value, x_value))
            for coordinate, adjacent_point in (
                ("x", (m_value, x_value + 1)),
                ("m", (m_value + 1, x_value)),
            ):
                adjacent = get(adjacent_point)
                increments = [
                    right - left
                    for left, right in zip(base["combined"], adjacent["combined"])
                ]
                base_increments = [
                    right - left
                    for left, right in zip(base["base"], adjacent["base"])
                ]
                reserve_increments = [
                    right - left
                    for left, right in zip(base["reserve"], adjacent["reserve"])
                ]
                compensation = []
                for r, (base_increment, reserve_increment) in enumerate(
                    zip(base_increments, reserve_increments)
                ):
                    denominator = r * reserve_increment
                    if base_increment < 0 and denominator > 0:
                        ratio = Fraction(-base_increment, denominator)
                        item = {
                            "r": r,
                            "numerator": ratio.numerator,
                            "denominator": ratio.denominator,
                            "ratio": float(ratio),
                        }
                        compensation.append(item)
                        candidate = {
                            "parity": parity,
                            "coordinate": coordinate,
                            "m": m_value,
                            "x": x_value,
                            **item,
                        }
                        if (
                            worst_compensation is None
                            or ratio > Fraction(
                                worst_compensation["numerator"],
                                worst_compensation["denominator"],
                            )
                        ):
                            worst_compensation = candidate
                negative = [
                    {"r": r, "increment": value}
                    for r, value in enumerate(increments)
                    if value < 0
                ]
                record = {
                    "parity": parity,
                    "coordinate": coordinate,
                    "m": m_value,
                    "x": x_value,
                    "order_range": [0, maximum_r],
                    "negative_increment_count": len(negative),
                    "minimum_increment": min(increments),
                    "negative_base_increment_count": sum(
                        value < 0 for value in base_increments
                    ),
                    "minimum_base_increment": min(base_increments),
                    "negative_reserve_increment_count": sum(
                        value < 0 for value in reserve_increments
                    ),
                    "minimum_reserve_increment": min(reserve_increments),
                    "worst_compensation": max(
                        compensation,
                        key=lambda item: Fraction(
                            item["numerator"], item["denominator"]
                        ),
                        default=None,
                    ),
                    "first_negative": negative[:10],
                }
                records.append(record)
                failures.extend(negative)
                print(
                    parity,
                    coordinate,
                    m_value,
                    x_value,
                    len(negative),
                    record["negative_base_increment_count"],
                    record["negative_reserve_increment_count"],
                    flush=True,
                )
    report = {
        "status": "PASS_FINITE_MONOTONICITY_PROBE" if not failures else "FAIL",
        "parameter_point_count": len(POINTS),
        "comparison_count": len(records),
        "order_check_count": len(records) * (maximum_r + 1),
        "failure_count": len(failures),
        "worst_compensation": worst_compensation,
        "records": records,
        "warning": "Finite exact evidence only.",
    }
    Path(
        "path_isolate_p4_bottom_pair_affine_parameter_monotonicity_"
        "probe_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "records"}, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
