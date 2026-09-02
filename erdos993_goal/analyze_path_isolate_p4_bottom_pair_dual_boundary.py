#!/usr/bin/env python3
"""Locate the auxiliary negative coefficients near bottom-pair cone entry.

This is a diagnostic for the moving-boundary proof.  It records where the
original and reciprocal forms are negative, together with their distances
from the corresponding southwest-square boundary.
"""

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
from probe_path_isolate_p4_affine_target_rows import (
    A,
    T as T_dict,
    V as V_dict,
    multiply,
    power,
)
from probe_path_isolate_p4_group_affine_southwest_square_entry import (
    S,
    W,
    add_scaled,
    evaluate,
)


def negative_summary(poly: dict[tuple[int, int], int], cap: int) -> dict:
    negative = [
        (i, j, value)
        for (i, j), value in poly.items()
        if i <= cap and j <= cap and value < 0
    ]
    if not negative:
        return {"count": 0}
    positions = [(i, j) for i, j, _ in negative]
    return {
        "count": len(negative),
        "minimum_value": min(value for _, _, value in negative),
        "minimum_i": min(i for i, _ in positions),
        "minimum_j": min(j for _, j in positions),
        "maximum_i": max(i for i, _ in positions),
        "maximum_j": max(j for _, j in positions),
        "minimum_distance_to_top_or_right": min(
            min(cap - i, cap - j) for i, j in positions
        ),
        "maximum_distance_to_top_or_right": max(
            min(cap - i, cap - j) for i, j in positions
        ),
        "closest_to_diagonal": min(
            negative, key=lambda item: abs(item[0] - item[1])
        ),
        "most_negative": min(negative, key=lambda item: item[2]),
    }


def main() -> None:
    parameter_points = [(12, 0), (16, 0), (20, 0), (24, 0), (30, 0)]
    records = []
    for parity in (0, 1):
        constant, slope = load_bottom(parity)
        kernel = sp.Poly(sp.cancel((constant - slope) / (q**2 * T**3)), x)
        affine = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        p_source = to_sparse(sp.expand(slope * A_expr))
        b_source = to_sparse(sp.expand(q**2 * T**3 * affine * V + slope * A_expr))
        p_reciprocal, degree = reciprocal(p_source)
        b_reciprocal, b_degree = reciprocal(b_source)
        assert degree == b_degree == 26

        for m_value, x_value in parameter_points:
            reciprocal_target = 4 * m_value + x_value + 2 * parity + 8
            original_cap = 2 * m_value + x_value + 8

            p_original = evaluate(p_source, 0, m_value, x_value, original_cap)
            b_original = evaluate(b_source, 0, m_value, x_value, original_cap)
            for factor, exponent in (
                (A, m_value + x_value - 3),
                (T_dict, 2 * m_value + parity - 5),
            ):
                factor_power = power(factor, exponent, original_cap)
                p_original = multiply(p_original, factor_power, original_cap)
                b_original = multiply(b_original, factor_power, original_cap)

            p_recip = evaluate(
                p_reciprocal, 0, m_value, x_value, reciprocal_target
            )
            b_recip = evaluate(
                b_reciprocal, 0, m_value, x_value, reciprocal_target
            )
            for factor, exponent in (
                (A, m_value + x_value - 3),
                (S, 2 * m_value + parity - 5),
            ):
                factor_power = power(factor, exponent, reciprocal_target)
                p_recip = multiply(p_recip, factor_power, reciprocal_target)
                b_recip = multiply(b_recip, factor_power, reciprocal_target)

            entry = None
            order_records = []
            maximum_r = m_value + 5
            for r in range(maximum_r + 1):
                original_target = m_value + r + 5
                original_combined = add_scaled(b_original, p_original, r)
                reciprocal_combined = add_scaled(b_recip, p_recip, r)
                original_negative = negative_summary(
                    original_combined, original_target
                )
                reciprocal_negative = negative_summary(
                    reciprocal_combined, reciprocal_target
                )
                if reciprocal_negative["count"] == 0 and entry is None:
                    entry = r
                if (
                    original_negative["count"]
                    or reciprocal_negative["count"]
                    or r <= 6
                ):
                    order_records.append(
                        {
                            "r": r,
                            "original_target": original_target,
                            "central": original_combined.get(
                                (original_target, original_target), 0
                            ),
                            "original_negative": original_negative,
                            "reciprocal_negative": reciprocal_negative,
                        }
                    )
                if entry is not None and r >= entry:
                    break
                p_original = multiply(p_original, V_dict, original_cap)
                b_original = multiply(b_original, V_dict, original_cap)
                p_recip = multiply(p_recip, W, reciprocal_target)
                b_recip = multiply(b_recip, W, reciprocal_target)

            record = {
                "parity": parity,
                "m": m_value,
                "x": x_value,
                "reciprocal_target": reciprocal_target,
                "entry_order": entry,
                "orders": order_records,
            }
            records.append(record)
            print(parity, m_value, entry, flush=True)

    report = {
        "status": "PROBE",
        "records": records,
    }
    Path(
        "path_isolate_p4_bottom_pair_dual_boundary_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
