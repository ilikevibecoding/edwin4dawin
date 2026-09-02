#!/usr/bin/env python3
"""Test whether the bottom-pair parity difference is a group bridge."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import (
    A,
    T,
    V,
    c,
    m,
    x,
)
from prove_path_isolate_p4_bottom_pair_affine_slope import load_bottom
from prove_path_isolate_p4_curvature_reserve_identity import split_sparse


z, w = sp.symbols("z w")
q = z * w


def group_kernels(parity: int) -> tuple[sp.Expr, sp.Expr]:
    constant, slope = split_sparse(
        Path(
            "path_isolate_p4_group_integrand_stable_"
            f"parity{parity}_terms_20260730.json"
        ),
        "zwcmsx",
    )
    kernel = sp.Poly(sp.cancel((constant - slope) / T**3), x)
    affine = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
    p_kernel = sp.expand(slope * A)
    b_kernel = sp.expand(T**3 * affine * V + slope * A)
    return b_kernel, p_kernel


def pair_kernels(parity: int) -> tuple[sp.Expr, sp.Expr]:
    constant, slope = load_bottom(parity)
    kernel = sp.Poly(sp.cancel((constant - slope) / (q**2 * T**3)), x)
    affine = kernel.coeff_monomial(1) + x * kernel.coeff_monomial(x)
    p_kernel = sp.expand(slope * A)
    b_kernel = sp.expand(q**2 * T**3 * affine * V + slope * A)
    return b_kernel, p_kernel


def summary(expression: sp.Expr) -> dict:
    shifted = sp.expand(expression.subs(m, m + 3))
    poly = sp.Poly(shifted, z, w, m, x)
    negative = [
        (monomial, coefficient)
        for monomial, coefficient in poly.terms()
        if coefficient < 0
    ]
    return {
        "term_count": len(poly.terms()),
        "degrees_z_w_M_x": [int(value) for value in poly.degree_list()],
        "negative_coefficient_count": len(negative),
        "minimum_coefficient": int(min(poly.coeffs(), default=0)),
        "first_negative": [
            {"monomial_z_w_M_x": list(monomial), "coefficient": int(coefficient)}
            for monomial, coefficient in negative[:20]
        ],
    }


def main() -> None:
    pair = [pair_kernels(parity) for parity in (0, 1)]
    group = [group_kernels(parity) for parity in (0, 1)]
    pair_b_difference = sp.expand(pair[1][0] - pair[0][0])
    pair_p_difference = sp.expand(pair[1][1] - pair[0][1])
    assert sp.expand(pair_p_difference - q * A * group[0][1]) == 0
    assert sp.expand(group[1][1] - group[0][1]) == 0

    records = []
    for group_parity in (0, 1):
        for c_value in (1, 2):
            candidate = sp.expand(
                q * A * group[group_parity][0].subs(c, c_value)
            )
            residual = sp.expand(pair_b_difference - candidate)
            records.append(
                {
                    "group_parity": group_parity,
                    "group_c": c_value,
                    "residual": summary(residual),
                    "exact_zero": residual == 0,
                }
            )
            print(records[-1], flush=True)
    report = {
        "status": "ANALYSIS",
        "reserve_identity": (
            "P_pair_1-P_pair_0=zw*(1+z)*(1+w)*P_group"
        ),
        "base_candidates": (
            "B_pair_1-B_pair_0-zw*(1+z)*(1+w)*B_group_e(c)"
        ),
        "domain_shift": "m=3+M",
        "records": records,
    }
    Path(
        "path_isolate_p4_bottom_pair_parity_bridge_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
