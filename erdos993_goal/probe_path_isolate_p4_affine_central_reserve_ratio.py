#!/usr/bin/env python3
"""Stress the exact central base/reserve ratio in both affine packages."""

from __future__ import annotations

import argparse
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
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


def ratio_record(
    package: str,
    parity: int,
    parameters: dict[str, int],
    r: int,
    target: int,
    base: int,
    reserve_unit: int,
) -> dict:
    combined = base + r * reserve_unit
    candidate_delta = 19 if package == "bottom" else 20
    fraction = (
        Fraction(-base, r * reserve_unit)
        if r and base < 0 and reserve_unit > 0
        else Fraction(0, 1)
    )
    return {
        "package": package,
        "parity": parity,
        **parameters,
        "r": r,
        "target": target,
        "base": base,
        "reserve_unit": reserve_unit,
        "combined": combined,
        "parameter_bound_delta": candidate_delta,
        "parameter_bound_scaled_margin": (
            (parameters["m"] + candidate_delta) * base
            + parameters["m"] * r * reserve_unit
        ),
        "three_eighths_scaled_margin": 8 * base + 3 * r * reserve_unit,
        "reserve_fraction_numerator": fraction.numerator,
        "reserve_fraction_denominator": fraction.denominator,
        "reserve_fraction_used": float(fraction),
    }


def bottom_records(maximum_r: int, ray_only: bool) -> list[dict]:
    result = []
    points = (
        [(m_value, 2 * m_value) for m_value in (30, 40, 50, 60)]
        if ray_only
        else sorted(
        {
            *((m_value, 0) for m_value in (3, 4, 6, 8, 10, 12, 16, 20, 24, 30)),
            *((3, x_value) for x_value in (0, 4, 12, 24, 48)),
            (10, 24),
            (20, 24),
            (12, 24),
            (16, 32),
            (20, 40),
            (24, 48),
            (30, 60),
        }
        )
    )
    for parity in (0, 1):
        constant, slope = load_bottom(parity)
        kernel = sp.Poly(sp.cancel((constant - slope) / (q**2 * T**3)), x)
        affine = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        p_source = to_sparse(sp.expand(slope * A_expr))
        b_source = to_sparse(sp.expand(q**2 * T**3 * affine * V + slope * A_expr))
        for m_value, x_value in points:
            cap = m_value + maximum_r + 5
            p_poly = evaluate(p_source, 0, m_value, x_value, cap)
            b_poly = evaluate(b_source, 0, m_value, x_value, cap)
            for factor, exponent in (
                (A, m_value + x_value - 3),
                (T_dict, 2 * m_value + parity - 5),
            ):
                factor_power = power(factor, exponent, cap)
                p_poly = multiply(p_poly, factor_power, cap)
                b_poly = multiply(b_poly, factor_power, cap)
            for r in range(maximum_r + 1):
                target = m_value + r + 5
                result.append(
                    ratio_record(
                        "bottom",
                        parity,
                        {"m": m_value, "x": x_value},
                        r,
                        target,
                        b_poly.get((target, target), 0),
                        p_poly.get((target, target), 0),
                    )
                )
                p_poly = multiply(p_poly, V_dict, cap)
                b_poly = multiply(b_poly, V_dict, cap)
            print("bottom", parity, m_value, x_value, flush=True)
    return result


def group_records(maximum_r: int, ray_only: bool) -> list[dict]:
    result = []
    points = (
        [
            (1, m_value, 2 * m_value)
            for m_value in (30, 40, 50, 60)
        ]
        if ray_only
        else sorted(
        {
            *((1, m_value, 0) for m_value in (3, 4, 6, 8, 10, 12, 16, 20, 24, 30)),
            *((c_value, 3, 0) for c_value in (1, 2, 4, 8, 12, 16, 20, 24, 30)),
            *((max(1, m_value // 2), m_value, 0) for m_value in (4, 8, 12, 16, 20, 24, 30)),
            (1, 3, 24),
            (1, 12, 24),
            (1, 16, 32),
            (1, 20, 40),
            (1, 24, 48),
            (1, 30, 60),
            (8, 3, 24),
            (4, 7, 12),
            (8, 16, 32),
            (10, 20, 40),
            (12, 24, 48),
            (15, 30, 60),
        }
        )
    )
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
        for c_value, m_value, x_value in points:
            cap = m_value + maximum_r + 5
            p_poly = evaluate(p_source, c_value, m_value, x_value, cap)
            b_poly = evaluate(b_source, c_value, m_value, x_value, cap)
            for factor, exponent in (
                (A, 2 * c_value + m_value + x_value - 3),
                (T_dict, 2 * m_value + parity - 4),
            ):
                factor_power = power(factor, exponent, cap)
                p_poly = multiply(p_poly, factor_power, cap)
                b_poly = multiply(b_poly, factor_power, cap)
            for r in range(maximum_r + 1):
                target = m_value + r + 5
                result.append(
                    ratio_record(
                        "group",
                        parity,
                        {"c": c_value, "m": m_value, "x": x_value},
                        r,
                        target,
                        b_poly.get((target, target), 0),
                        p_poly.get((target, target), 0),
                    )
                )
                p_poly = multiply(p_poly, V_dict, cap)
                b_poly = multiply(b_poly, V_dict, cap)
            print("group", parity, c_value, m_value, x_value, flush=True)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--package", choices=("both", "bottom", "group"), default="both"
    )
    parser.add_argument("--maximum-r", type=int, default=50)
    parser.add_argument("--ray-only", action="store_true")
    args = parser.parse_args()
    records = []
    if args.package in ("both", "bottom"):
        records.extend(bottom_records(args.maximum_r, args.ray_only))
    if args.package in ("both", "group"):
        records.extend(group_records(args.maximum_r, args.ray_only))
    negative_combined = [item for item in records if item["combined"] < 0]
    negative_three_eighths = [
        item for item in records if item["three_eighths_scaled_margin"] < 0
    ]
    negative_base = [item for item in records if item["base"] < 0]
    negative_parameter_bound = [
        item for item in records if item["parameter_bound_scaled_margin"] < 0
    ]
    report = {
        "status": "PROBE",
        "case_count": len(records),
        "negative_base_count": len(negative_base),
        "negative_combined_count": len(negative_combined),
        "negative_three_eighths_bound_count": len(negative_three_eighths),
        "negative_parameter_bound_count": len(negative_parameter_bound),
        "maximum_r": args.maximum_r,
        "ray_only": args.ray_only,
        "worst_reserve_fraction": max(
            records, key=lambda item: item["reserve_fraction_used"]
        ),
        "first_negative_combined": negative_combined[:20],
        "first_negative_three_eighths_bound": negative_three_eighths[:20],
        "first_negative_parameter_bound": negative_parameter_bound[:20],
        "records": records,
    }
    mode_suffix = "_rays" if args.ray_only else ""
    Path(
        "path_isolate_p4_affine_central_reserve_ratio_"
        f"{args.package}{mode_suffix}_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "records"}, indent=2))


if __name__ == "__main__":
    main()
