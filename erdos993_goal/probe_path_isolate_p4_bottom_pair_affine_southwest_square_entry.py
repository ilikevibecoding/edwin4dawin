#!/usr/bin/env python3
"""Probe all-order southwest-square entry for the bottom-pair affine bridge."""

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
from analyze_path_isolate_p4_group_grouped_tail_symbolic import reciprocal
from probe_path_isolate_p4_affine_target_rows import multiply, power
from probe_path_isolate_p4_group_affine_southwest_square_entry import (
    A,
    S,
    W,
    add_scaled,
    evaluate,
)


def main() -> None:
    parameter_points = [
        (3, 0),
        (4, 0),
        (6, 0),
        (10, 0),
        (20, 0),
        (3, 4),
        (3, 12),
        (3, 24),
        (3, 48),
        (10, 24),
    ]
    maximum_r = 50
    records = []
    for parity in (0, 1):
        constant, slope = load_bottom(parity)
        kernel = sp.Poly(sp.cancel((constant - slope) / (q**2 * T**3)), x)
        affine_kernel = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        p_source = to_sparse(sp.expand(slope * A_expr))
        b_source = to_sparse(
            sp.expand(q**2 * T**3 * affine_kernel * V + slope * A_expr)
        )
        p_reciprocal, degree = reciprocal(p_source)
        b_reciprocal, b_degree = reciprocal(b_source)
        assert degree == b_degree == 26
        for m_value, x_value in parameter_points:
            a = m_value + x_value - 3
            b = 2 * m_value + parity - 5
            target = 4 * m_value + x_value + 2 * parity + 8
            p_poly = evaluate(p_reciprocal, 0, m_value, x_value, target)
            b_poly = evaluate(b_reciprocal, 0, m_value, x_value, target)
            for factor, exponent in ((A, a), (S, b)):
                factor_power = power(factor, exponent, target)
                p_poly = multiply(p_poly, factor_power, target)
                b_poly = multiply(b_poly, factor_power, target)
            entry_order = None
            central_failures = []
            negative_counts = []
            for r in range(maximum_r + 1):
                combined = add_scaled(b_poly, p_poly, r)
                central = combined.get((target, target), 0)
                if central < 0:
                    central_failures.append({"r": r, "value": central})
                negatives = sum(value < 0 for value in combined.values())
                negative_counts.append(negatives)
                if negatives == 0:
                    entry_order = r
                    break
                p_poly = multiply(p_poly, W, target)
                b_poly = multiply(b_poly, W, target)
            record = {
                "parity": parity,
                "m": m_value,
                "x": x_value,
                "target_N": target,
                "entry_order": entry_order,
                "negative_counts": negative_counts,
                "pre_entry_central_failure_count": len(central_failures),
                "pre_entry_central_failures": central_failures[:20],
                "all_orders_certified_for_this_point": (
                    entry_order is not None and not central_failures
                ),
            }
            records.append(record)
            print(parity, m_value, x_value, target, entry_order, len(central_failures), flush=True)
    report = {
        "status": "PROBE",
        "identity": "A^a*S^b*W^r*(B_e^vee+r*P_e^vee)",
        "target": "N=4m+x+2epsilon+8",
        "parameter_point_count": len(parameter_points),
        "parity_case_count": len(records),
        "all_entered": all(record["entry_order"] is not None for record in records),
        "all_orders_certified_for_every_point": all(
            record["all_orders_certified_for_this_point"] for record in records
        ),
        "pre_entry_central_failure_count": sum(
            record["pre_entry_central_failure_count"] for record in records
        ),
        "maximum_entry_order": max(
            (record["entry_order"] for record in records if record["entry_order"] is not None),
            default=None,
        ),
        "records": records,
    }
    Path(
        "path_isolate_p4_bottom_pair_affine_southwest_square_entry_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "records"}, indent=2))


if __name__ == "__main__":
    main()
