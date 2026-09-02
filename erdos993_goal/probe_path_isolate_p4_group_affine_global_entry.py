#!/usr/bin/env python3
"""Check global coefficientwise positivity at observed square-entry orders."""

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
from analyze_path_isolate_p4_group_grouped_tail_symbolic import reciprocal
from probe_path_isolate_p4_affine_target_rows import multiply, power
from probe_path_isolate_p4_group_affine_southwest_square_entry import (
    A,
    S,
    W,
    add_scaled,
    evaluate,
)
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


def main() -> None:
    entry_report = json.loads(
        Path(
            "path_isolate_p4_group_affine_southwest_square_entry_"
            "rays_x0_probe_20260801.json"
        ).read_text(encoding="utf-8")
    )
    selected = [
        record
        for record in entry_report["records"]
        if (
            (record["c"] == 1 and record["m"] in (3, 10, 20))
            or (record["m"] == 3 and record["c"] in (4, 10, 15, 20))
        )
        and record["entry_order"] is not None
    ]
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
        affine_kernel = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        p_source = to_sparse(sp.expand(slope * A_expr))
        b_source = to_sparse(sp.expand(T**3 * affine_kernel * V + slope * A_expr))
        p_reciprocal, degree = reciprocal(p_source)
        b_reciprocal, b_degree = reciprocal(b_source)
        assert degree == b_degree == 24
        for item in selected:
            if item["parity"] != parity:
                continue
            c_value = item["c"]
            m_value = item["m"]
            x_value = item["x"]
            r = item["entry_order"]
            a = 2 * c_value + m_value + x_value - 3
            b = 2 * m_value + parity - 4
            full_degree = a + 2 * b + r + degree
            p_poly = evaluate(p_reciprocal, c_value, m_value, x_value, full_degree)
            b_poly = evaluate(b_reciprocal, c_value, m_value, x_value, full_degree)
            for factor, exponent in ((A, a), (S, b), (W, r)):
                factor_power = power(factor, exponent, full_degree)
                p_poly = multiply(p_poly, factor_power, full_degree)
                b_poly = multiply(b_poly, factor_power, full_degree)
            combined = add_scaled(b_poly, p_poly, r)
            negatives = [(key, value) for key, value in combined.items() if value < 0]
            record = {
                "parity": parity,
                "c": c_value,
                "m": m_value,
                "x": x_value,
                "entry_order": r,
                "full_bidegree": full_degree,
                "term_count": len(combined),
                "global_negative_coefficient_count": len(negatives),
                "first_negative": [
                    {"position": list(key), "value": value}
                    for key, value in negatives[:10]
                ],
            }
            records.append(record)
            print(parity, c_value, m_value, r, len(negatives), flush=True)
    report = {
        "status": "PROBE",
        "case_count": len(records),
        "globally_nonnegative_case_count": sum(
            not record["global_negative_coefficient_count"] for record in records
        ),
        "records": records,
    }
    Path(
        "path_isolate_p4_group_affine_global_entry_probe_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "records"}, indent=2))


if __name__ == "__main__":
    main()
