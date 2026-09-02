#!/usr/bin/env python3
"""Probe the original-variable southwest square of the affine group bridge."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import (
    A as A_expr,
    T,
    V,
    c,
    m,
    to_sparse,
    x,
)
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


def main() -> None:
    parameter_points = [
        (1, 3, 0),
        (1, 3, 24),
        (1, 12, 0),
        (1, 12, 24),
        (4, 7, 0),
        (8, 3, 0),
    ]
    maximum_r = 24
    maximum_target = max(mv + maximum_r + 5 for _, mv, _ in parameter_points)
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
        p_source = to_sparse(sp.expand(slope * A_expr))
        b_source = to_sparse(sp.expand(T**3 * affine * V + slope * A_expr))
        for c_value, m_value, x_value in parameter_points:
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
            first_nonnegative_square = None
            negative_counts = []
            central_failures = []
            for r in range(maximum_r + 1):
                target = m_value + r + 5
                combined = add_scaled(b_poly, p_poly, r)
                negatives = [
                    value
                    for (i, j), value in combined.items()
                    if i <= target and j <= target and value < 0
                ]
                negative_counts.append(len(negatives))
                if combined.get((target, target), 0) < 0:
                    central_failures.append(r)
                if not negatives and first_nonnegative_square is None:
                    first_nonnegative_square = r
                p_poly = multiply(p_poly, V_dict, cap)
                b_poly = multiply(b_poly, V_dict, cap)
            record = {
                "parity": parity,
                "c": c_value,
                "m": m_value,
                "x": x_value,
                "r_range": [0, maximum_r],
                "first_nonnegative_square": first_nonnegative_square,
                "negative_counts": negative_counts,
                "central_failures": central_failures,
            }
            records.append(record)
            print(parity, c_value, m_value, x_value, first_nonnegative_square, min(negative_counts), flush=True)
    report = {
        "status": "PROBE",
        "square": "0<=i,j<=m+r+5 in original variables",
        "case_count": len(records),
        "central_failure_count": sum(len(record["central_failures"]) for record in records),
        "records": records,
    }
    Path(
        "path_isolate_p4_group_affine_original_target_square_probe_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "records"}, indent=2))


if __name__ == "__main__":
    main()
