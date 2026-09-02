#!/usr/bin/env python3
"""Test original-square coverage of bottom-pair reciprocal pre-entry windows."""

from __future__ import annotations

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


def main() -> None:
    entry = json.loads(
        Path(
            "path_isolate_p4_bottom_pair_affine_southwest_square_entry_"
            "20260801.json"
        ).read_text(encoding="utf-8")
    )
    records = []
    for parity in (0, 1):
        constant, slope = load_bottom(parity)
        kernel = sp.Poly(sp.cancel((constant - slope) / (q**2 * T**3)), x)
        affine = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        p_source = to_sparse(sp.expand(slope * A_expr))
        b_source = to_sparse(
            sp.expand(q**2 * T**3 * affine * V + slope * A_expr)
        )
        for item in (record for record in entry["records"] if record["parity"] == parity):
            m_value, x_value = item["m"], item["x"]
            entry_order = item["entry_order"]
            cap = m_value + max(entry_order - 1, 0) + 5
            p_poly = evaluate(p_source, 0, m_value, x_value, cap)
            b_poly = evaluate(b_source, 0, m_value, x_value, cap)
            for factor, exponent in (
                (A, m_value + x_value - 3),
                (T_dict, 2 * m_value + parity - 5),
            ):
                factor_power = power(factor, exponent, cap)
                p_poly = multiply(p_poly, factor_power, cap)
                b_poly = multiply(b_poly, factor_power, cap)
            uncovered = []
            for r in range(entry_order):
                target = m_value + r + 5
                combined = add_scaled(b_poly, p_poly, r)
                if any(
                    value < 0
                    for (i, j), value in combined.items()
                    if i <= target and j <= target
                ):
                    uncovered.append(r)
                p_poly = multiply(p_poly, V_dict, cap)
                b_poly = multiply(b_poly, V_dict, cap)
            record = {
                "parity": parity,
                "m": m_value,
                "x": x_value,
                "reciprocal_entry_order": entry_order,
                "preentry_order_count": entry_order,
                "original_square_uncovered_orders": uncovered,
                "uncovered_orders_above_r5": [r for r in uncovered if r >= 6],
            }
            records.append(record)
            print(record, flush=True)
    report = {
        "status": "PROBE",
        "parity_case_count": len(records),
        "preentry_order_count": sum(record["preentry_order_count"] for record in records),
        "original_square_uncovered_order_count": sum(
            len(record["original_square_uncovered_orders"]) for record in records
        ),
        "uncovered_order_count_above_r5": sum(
            len(record["uncovered_orders_above_r5"]) for record in records
        ),
        "records": records,
    }
    Path(
        "path_isolate_p4_bottom_pair_affine_dual_square_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "records"}, indent=2))


if __name__ == "__main__":
    main()
