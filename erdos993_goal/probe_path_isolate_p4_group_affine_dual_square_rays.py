#!/usr/bin/env python3
"""Test original-square coverage of every reciprocal pre-entry ray window."""

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
    entry = json.loads(
        Path(
            "path_isolate_p4_group_affine_southwest_square_entry_"
            "rays_x0_probe_20260801.json"
        ).read_text(encoding="utf-8")
    )
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
        parity_entries = [
            item for item in entry["records"] if item["parity"] == parity
        ]
        for item in parity_entries:
            c_value, m_value, x_value = item["c"], item["m"], item["x"]
            entry_order = item["entry_order"]
            maximum_preentry = entry_order - 1
            cap = m_value + max(maximum_preentry, 0) + 5
            p_poly = evaluate(p_source, c_value, m_value, x_value, cap)
            b_poly = evaluate(b_source, c_value, m_value, x_value, cap)
            for factor, exponent in (
                (A, 2 * c_value + m_value + x_value - 3),
                (T_dict, 2 * m_value + parity - 4),
            ):
                factor_power = power(factor, exponent, cap)
                p_poly = multiply(p_poly, factor_power, cap)
                b_poly = multiply(b_poly, factor_power, cap)
            uncovered_orders = []
            negative_counts = []
            for r in range(entry_order):
                target = m_value + r + 5
                combined = add_scaled(b_poly, p_poly, r)
                negatives = sum(
                    value < 0
                    for (i, j), value in combined.items()
                    if i <= target and j <= target
                )
                negative_counts.append(negatives)
                if negatives:
                    uncovered_orders.append(r)
                p_poly = multiply(p_poly, V_dict, cap)
                b_poly = multiply(b_poly, V_dict, cap)
            record = {
                "parity": parity,
                "c": c_value,
                "m": m_value,
                "x": x_value,
                "reciprocal_entry_order": entry_order,
                "preentry_order_count": entry_order,
                "original_square_uncovered_orders": uncovered_orders,
                "uncovered_order_count": len(uncovered_orders),
                "uncovered_orders_above_r5": [
                    value for value in uncovered_orders if value >= 6
                ],
                "negative_counts": negative_counts,
            }
            records.append(record)
            print(
                parity,
                c_value,
                m_value,
                entry_order,
                len(uncovered_orders),
                record["uncovered_orders_above_r5"],
                flush=True,
            )
    report = {
        "status": "PROBE",
        "parity_case_count": len(records),
        "preentry_order_count": sum(record["preentry_order_count"] for record in records),
        "original_square_uncovered_order_count": sum(
            record["uncovered_order_count"] for record in records
        ),
        "uncovered_order_count_above_r5": sum(
            len(record["uncovered_orders_above_r5"]) for record in records
        ),
        "cases_with_uncovered_orders_above_r5": sum(
            bool(record["uncovered_orders_above_r5"]) for record in records
        ),
        "records": records,
    }
    Path(
        "path_isolate_p4_group_affine_dual_square_rays_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "records"}, indent=2))


if __name__ == "__main__":
    main()
