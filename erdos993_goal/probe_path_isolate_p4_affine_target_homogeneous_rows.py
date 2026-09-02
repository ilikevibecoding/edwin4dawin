#!/usr/bin/env python3
"""Probe HCU of the one homogeneous row containing each affine target."""

from __future__ import annotations

import argparse
import json
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
from probe_path_isolate_p4_group_affine_southwest_square_entry import (
    add_scaled,
    evaluate,
)
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


def row_summary(poly: dict[tuple[int, int], int], target: int) -> dict:
    row = [poly.get((i, 2 * target - i), 0) for i in range(target + 1)]
    differences = []
    previous = 0
    for value in row:
        differences.append(value - previous)
        previous = value
    return {
        "central": row[-1],
        "minimum_row_coefficient": min(row),
        "minimum_schur_coefficient": min(differences),
        "negative_row_coefficient_count": sum(value < 0 for value in row),
        "negative_schur_coefficient_count": sum(
            value < 0 for value in differences
        ),
        "first_negative_row_index": next(
            (i for i, value in enumerate(row) if value < 0), None
        ),
        "first_negative_schur_index": next(
            (i for i, value in enumerate(differences) if value < 0), None
        ),
    }


def bottom_records() -> list[dict]:
    result = []
    points = [(3, 0), (6, 0), (10, 0), (20, 0), (3, 24), (10, 24)]
    maximum_r = 24
    for parity in (0, 1):
        constant, slope = load_bottom(parity)
        kernel = sp.Poly(sp.cancel((constant - slope) / (q**2 * T**3)), x)
        affine = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        p_source = to_sparse(sp.expand(slope * A_expr))
        b_source = to_sparse(sp.expand(q**2 * T**3 * affine * V + slope * A_expr))
        for m_value, x_value in points:
            largest_target = m_value + maximum_r + 5
            cap = 2 * largest_target
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
                summary = row_summary(add_scaled(b_poly, p_poly, r), target)
                base_central = b_poly.get((target, target), 0)
                reserve_unit_central = p_poly.get((target, target), 0)
                result.append(
                    {
                        "package": "bottom",
                        "parity": parity,
                        "m": m_value,
                        "x": x_value,
                        "r": r,
                        "target": target,
                        "base_central": base_central,
                        "reserve_unit_central": reserve_unit_central,
                        "reserve_fraction_used": (
                            (-base_central) / (r * reserve_unit_central)
                            if r and base_central < 0 and reserve_unit_central > 0
                            else 0.0
                        ),
                        **summary,
                    }
                )
                p_poly = multiply(p_poly, V_dict, cap)
                b_poly = multiply(b_poly, V_dict, cap)
            print("bottom", parity, m_value, x_value, flush=True)
    return result


def group_records() -> list[dict]:
    result = []
    points = [
        (1, 3, 0),
        (1, 12, 0),
        (8, 3, 0),
        (4, 7, 0),
        (1, 3, 24),
        (8, 3, 24),
    ]
    maximum_r = 24
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
            largest_target = m_value + maximum_r + 5
            cap = 2 * largest_target
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
                summary = row_summary(add_scaled(b_poly, p_poly, r), target)
                base_central = b_poly.get((target, target), 0)
                reserve_unit_central = p_poly.get((target, target), 0)
                result.append(
                    {
                        "package": "group",
                        "parity": parity,
                        "c": c_value,
                        "m": m_value,
                        "x": x_value,
                        "r": r,
                        "target": target,
                        "base_central": base_central,
                        "reserve_unit_central": reserve_unit_central,
                        "reserve_fraction_used": (
                            (-base_central) / (r * reserve_unit_central)
                            if r and base_central < 0 and reserve_unit_central > 0
                            else 0.0
                        ),
                        **summary,
                    }
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
    args = parser.parse_args()
    records = []
    if args.package in ("both", "bottom"):
        records.extend(bottom_records())
    if args.package in ("both", "group"):
        records.extend(group_records())
    report = {
        "status": "PROBE",
        "case_count": len(records),
        "negative_central_count": sum(item["central"] < 0 for item in records),
        "negative_target_row_count": sum(
            item["negative_row_coefficient_count"] > 0 for item in records
        ),
        "non_hcu_target_row_count": sum(
            item["negative_schur_coefficient_count"] > 0 for item in records
        ),
        "first_negative_target_rows": [
            item for item in records if item["negative_row_coefficient_count"] > 0
        ][:20],
        "first_non_hcu_target_rows": [
            item for item in records if item["negative_schur_coefficient_count"] > 0
        ][:20],
        "records": records,
    }
    Path(
        f"path_isolate_p4_affine_target_homogeneous_rows_{args.package}_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "records"}, indent=2))


if __name__ == "__main__":
    main()
