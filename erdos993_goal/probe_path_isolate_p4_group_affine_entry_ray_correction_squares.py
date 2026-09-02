#!/usr/bin/env python3
"""Probe square-truncated correction terms on the two linear entry rays."""

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
    evaluate,
)
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


def negative_summary(poly, old_target: int, new_target: int) -> dict:
    old = [
        (key, value)
        for key, value in poly.items()
        if key[0] <= old_target and key[1] <= old_target and value < 0
    ]
    new = [
        (key, value)
        for key, value in poly.items()
        if key[0] <= new_target and key[1] <= new_target and value < 0
    ]
    band = [
        (key, value)
        for key, value in new
        if key[0] > old_target or key[1] > old_target
    ]
    return {
        "old_square_negative_count": len(old),
        "new_square_negative_count": len(new),
        "new_boundary_band_negative_count": len(band),
        "first_old_square_negative": [
            {"position": list(key), "value": value} for key, value in old[:10]
        ],
        "first_band_negative": [
            {"position": list(key), "value": value} for key, value in band[:10]
        ],
    }


def main() -> None:
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
        p_expr = sp.expand(slope * A_expr)
        b_expr = sp.expand(T**3 * affine_kernel * V + slope * A_expr)

        for old_m in (10, 15, 19):
            correction = sp.expand(
                b_expr.subs({c: 1, x: 0, m: old_m + 1})
                - b_expr.subs({c: 1, x: 0, m: old_m})
                + p_expr
            )
            source, degree = reciprocal(to_sparse(correction))
            assert degree == 24
            new_m = old_m + 1
            r_new = new_m - 4 + parity
            a_new = new_m - 1
            b_new = 2 * new_m + parity - 4
            old_target = 4 * old_m + 2 * parity + 10
            new_target = old_target + 4
            poly = evaluate(source, 0, 0, 0, new_target)
            for factor, exponent in ((A, a_new), (S, b_new), (W, r_new)):
                poly = multiply(poly, power(factor, exponent, new_target), new_target)
            record = {
                "parity": parity,
                "ray": "c=1,x=0,m increasing",
                "old_parameter": old_m,
                "new_parameter": new_m,
                "old_target": old_target,
                "new_target": new_target,
                **negative_summary(poly, old_target, new_target),
            }
            records.append(record)
            print(record, flush=True)

        for old_c in (15, 17, 19):
            correction = sp.expand(
                b_expr.subs({m: 3, x: 0, c: old_c + 1})
                - b_expr.subs({m: 3, x: 0, c: old_c})
                + 2 * p_expr
            )
            source, degree = reciprocal(to_sparse(correction))
            assert degree == 24
            new_c = old_c + 1
            r_new = 2 * new_c - 12
            a_new = 2 * new_c
            b_new = 2 + parity
            old_target = 2 * old_c + 2 * parity + 20
            new_target = old_target + 2
            poly = evaluate(source, 0, 0, 0, new_target)
            for factor, exponent in ((A, a_new), (S, b_new), (W, r_new)):
                poly = multiply(poly, power(factor, exponent, new_target), new_target)
            record = {
                "parity": parity,
                "ray": "m=3,x=0,c increasing",
                "old_parameter": old_c,
                "new_parameter": new_c,
                "old_target": old_target,
                "new_target": new_target,
                **negative_summary(poly, old_target, new_target),
            }
            records.append(record)
            print(record, flush=True)

    report = {
        "status": "PROBE",
        "case_count": len(records),
        "old_square_failure_count": sum(
            record["old_square_negative_count"] > 0 for record in records
        ),
        "new_square_failure_count": sum(
            record["new_square_negative_count"] > 0 for record in records
        ),
        "records": records,
    }
    Path(
        "path_isolate_p4_group_affine_entry_ray_correction_squares_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "records"}, indent=2))


if __name__ == "__main__":
    main()
