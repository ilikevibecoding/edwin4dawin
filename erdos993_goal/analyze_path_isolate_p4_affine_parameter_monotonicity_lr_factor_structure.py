#!/usr/bin/env python3
"""Factor the L/R sources in the symmetric-Pascal utilization identity.

For D=V L+R and U=-D, the two-copy cross source simplifies to

  U_1 R_2-U_2 R_1 = V_2 L_2 R_1-V_1 L_1 R_2.

This audit finds exact common factors and reports the residual bivariate
degrees and coefficient signs for every affine increment family.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import T, V, m, q, x, z, w
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import c
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    bottom_increment,
    group_increment,
    quotient,
)


def polynomial_summary(expression: sp.Expr) -> dict:
    polynomial = sp.Poly(sp.expand(expression), z, w, c, m, x)
    coefficients = polynomial.coeffs()
    return {
        "term_count": len(coefficients),
        "degrees_z_w_c_m_x": [int(value) for value in polynomial.degree_list()],
        "negative_coefficient_count": len(
            [value for value in coefficients if int(value) < 0]
        ),
        "positive_coefficient_count": len(
            [value for value in coefficients if int(value) > 0]
        ),
    }


def factor_strings(expression: sp.Expr) -> dict:
    coefficient, factors = sp.factor_list(expression, z, w, c, m, x)
    return {
        "content": str(coefficient),
        "factors": [
            {
                "factor": str(factor),
                "multiplicity": int(multiplicity),
                "summary": polynomial_summary(factor),
            }
            for factor, multiplicity in factors
        ],
    }


def audit(package: str, parity: int, coordinate: str) -> dict:
    d_expression, reserve_expression = (
        group_increment(parity, coordinate)
        if package == "group"
        else bottom_increment(parity, coordinate)
    )
    common = T**3 if package == "group" else q**2 * T**3
    d_reduced = quotient(d_expression, common)
    reserve_reduced = quotient(reserve_expression, common)
    ell = quotient(d_reduced - reserve_reduced, V)
    gcd = sp.gcd(sp.Poly(ell, z, w, c, m, x), sp.Poly(reserve_reduced, z, w, c, m, x)).as_expr()
    ell_residual = quotient(ell, gcd)
    reserve_residual = quotient(reserve_reduced, gcd)
    return {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "ell": polynomial_summary(ell),
        "reserve": polynomial_summary(reserve_reduced),
        "gcd": factor_strings(gcd),
        "gcd_summary": polynomial_summary(gcd),
        "ell_residual": polynomial_summary(ell_residual),
        "reserve_residual": polynomial_summary(reserve_residual),
        # Factoring the multi-thousand-term residuals is much more expensive
        # than the relevant gcd test and adds no information when the gcd is 1.
    }


def main() -> None:
    records = []
    for parity in (0, 1):
        for coordinate in ("x", "c", "m"):
            record = audit("group", parity, coordinate)
            records.append(record)
            print(
                record["package"], parity, coordinate,
                record["gcd_summary"], record["ell_residual"],
                record["reserve_residual"], flush=True,
            )
        for coordinate in ("x", "m"):
            record = audit("bottom", parity, coordinate)
            records.append(record)
            print(
                record["package"], parity, coordinate,
                record["gcd_summary"], record["ell_residual"],
                record["reserve_residual"], flush=True,
            )
    report = {
        "status": "LR_FACTOR_STRUCTURE_AUDIT",
        "identity": "U1*R2-U2*R1=V2*L2*R1-V1*L1*R2 for U=-(V*L+R).",
        "records": records,
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "lr_factor_structure_analysis_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "case_count": len(records)}, indent=2))


if __name__ == "__main__":
    main()
