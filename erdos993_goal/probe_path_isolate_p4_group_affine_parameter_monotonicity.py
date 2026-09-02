#!/usr/bin/env python3
"""Exact central stress and compensation ratios for affine monotonicity."""

from __future__ import annotations

import json
import argparse
from fractions import Fraction
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import A as A_expr, T, V, x
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import to_sparse
from probe_path_isolate_p4_affine_target_rows import (
    A,
    T as T_dict,
    V as V_dict,
    multiply,
    power,
)
from probe_path_isolate_p4_group_affine_southwest_square_entry import evaluate
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


POINTS = (
    (1, 3, 0),
    (1, 3, 24),
    (1, 9, 21),
    (1, 10, 20),
    (1, 12, 24),
    (1, 16, 40),
    (2, 3, 0),
    (2, 10, 20),
    (4, 3, 0),
    (4, 10, 20),
    (8, 3, 24),
    (8, 16, 40),
)

RAY_POINTS = (
    (1, 20, 40),
    (1, 30, 60),
    (1, 40, 80),
    (1, 50, 100),
    (1, 60, 120),
    (1, 60, 0),
    (2, 30, 60),
    (4, 30, 60),
)


def values(parity, c_value, m_value, x_value, maximum_r, b_source, p_source):
    cap = m_value + maximum_r + 5
    b_poly = evaluate(b_source, c_value, m_value, x_value, cap)
    p_poly = evaluate(p_source, c_value, m_value, x_value, cap)
    for factor, exponent in (
        (A, 2 * c_value + m_value + x_value - 3),
        (T_dict, 2 * m_value + parity - 4),
    ):
        factor_power = power(factor, exponent, cap)
        b_poly = multiply(b_poly, factor_power, cap)
        p_poly = multiply(p_poly, factor_power, cap)
    bases = []
    reserves = []
    combined = []
    for r in range(maximum_r + 1):
        target = m_value + r + 5
        base = b_poly.get((target, target), 0)
        reserve = p_poly.get((target, target), 0)
        bases.append(base)
        reserves.append(reserve)
        combined.append(base + r * reserve)
        b_poly = multiply(b_poly, V_dict, cap)
        p_poly = multiply(p_poly, V_dict, cap)
    return {"base": bases, "reserve": reserves, "combined": combined}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rays", action="store_true")
    args = parser.parse_args()
    points = RAY_POINTS if args.rays else POINTS
    maximum_r = 80 if args.rays else 40
    records = []
    failures = []
    worst_compensation = None
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
        p_source = to_sparse(sp.expand(slope * A_expr))
        b_source = to_sparse(sp.expand(T**3 * affine * V + slope * A_expr))
        cache = {}

        def get(point):
            if point not in cache:
                cache[point] = values(
                    parity, *point, maximum_r, b_source, p_source
                )
            return cache[point]

        for c_value, m_value, x_value in points:
            base = get((c_value, m_value, x_value))
            for coordinate, adjacent_point in (
                ("x", (c_value, m_value, x_value + 1)),
                ("c", (c_value + 1, m_value, x_value)),
                ("m", (c_value, m_value + 1, x_value)),
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
                            "c": c_value,
                            "m": m_value,
                            "x": x_value,
                            **item,
                        }
                        if (
                            worst_compensation is None
                            or Fraction(
                                candidate["numerator"], candidate["denominator"]
                            )
                            > Fraction(
                                worst_compensation["numerator"],
                                worst_compensation["denominator"],
                            )
                        ):
                            worst_compensation = candidate
                negative = [
                    {"r": r, "increment": value}
                    for r, value in enumerate(increments) if value < 0
                ]
                record = {
                    "parity": parity,
                    "coordinate": coordinate,
                    "c": c_value,
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
                    "compensated_order_count": len(compensation),
                    "worst_compensation": max(
                        compensation, key=lambda item: Fraction(
                            item["numerator"], item["denominator"]
                        ), default=None,
                    ),
                    "first_negative": negative[:10],
                }
                records.append(record)
                failures.extend(negative)
                print(
                    parity, coordinate, c_value, m_value, x_value,
                    len(negative), record["negative_base_increment_count"],
                    record["negative_reserve_increment_count"], flush=True,
                )
    report = {
        "status": "PASS_FINITE_MONOTONICITY_PROBE" if not failures else "FAIL",
        "dataset": "proportional_rays" if args.rays else "hard_points",
        "parameter_point_count": len(points),
        "comparison_count": len(records),
        "order_check_count": len(records) * (maximum_r + 1),
        "failure_count": len(failures),
        "worst_compensation": worst_compensation,
        "records": records,
        "warning": "Finite exact evidence only.",
    }
    Path(
        "path_isolate_p4_group_affine_parameter_monotonicity_probe_"
        f"{'rays_' if args.rays else ''}20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items()
                      if key != "records"}, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
