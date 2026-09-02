#!/usr/bin/env python3
"""Audit exact x- and c-increment kernels for the group affine bridge."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_affine_parameter_bound_integration_kernel import (
    cone_summary,
)
from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import (
    A,
    T,
    V,
    m,
    q,
    x,
)
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import c
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


def compact(audit: dict) -> dict:
    return {
        "reciprocal_bidegree": audit["reciprocal_bidegree"],
        "hcu": audit["reciprocal_hcu"]["hcu"],
        "negative_schur_coefficient_count": audit[
            "reciprocal_hcu"
        ]["negative_schur_coefficient_count"],
        "in_paired_cone": audit["reciprocal_paired_cone"]["in_paired_cone"],
        "paired_cone_failure_count": audit[
            "reciprocal_paired_cone"
        ]["failure_count"],
        "divisible_by_e1": audit["reciprocal_divisible_by_e1"],
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
        affine = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
        p_expr = sp.expand(slope * A)
        b_expr = sp.expand(T**3 * affine * V + p_expr)
        increments = {
            "x_base": sp.expand(A * b_expr.subs(x, x + 1) - b_expr),
            "x_reserve": sp.expand((A - 1) * p_expr),
            "c_base": sp.expand(A**2 * b_expr.subs(c, c + 1) - b_expr),
            "c_reserve": sp.expand((A**2 - 1) * p_expr),
            "m_base": sp.expand(A * T**2 * b_expr.subs(m, m + 1) - q * b_expr),
            "m_reserve": sp.expand((A * T**2 - q) * p_expr),
        }
        for coordinate in ("x", "c", "m"):
            base = increments[f"{coordinate}_base"]
            reserve = increments[f"{coordinate}_reserve"]
            for scalar in (0, 1, 2, 4, 8, 16, 32, 64):
                audit = compact(
                    cone_summary(sp.expand(base + scalar * reserve), 1)
                )
                records.append(
                    {
                        "parity": parity,
                        "coordinate": coordinate,
                        "scalar_r": scalar,
                        **audit,
                    }
                )
            print(parity, coordinate, records[-8:], flush=True)
    report = {
        "status": "ANALYSIS",
        "identities": {
            "x": "F(x+1)-F(x): A*B(x+1)-B(x)+r*(A-1)*P",
            "c": "F(c+1)-F(c): A^2*B(c+1)-B(c)+r*(A^2-1)*P",
            "m": (
                "F(m+1)-F(m), aligned at target N+1: "
                "A*T^2*B(m+1)-zw*B(m)+r*(A*T^2-zw)*P"
            ),
        },
        "records": records,
    }
    Path(
        "path_isolate_p4_group_affine_parameter_monotonicity_kernels_"
        "20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
