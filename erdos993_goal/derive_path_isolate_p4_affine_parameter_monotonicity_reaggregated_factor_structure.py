#!/usr/bin/env python3
"""Factor the reduced L and Q kernels in the two hardest families."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import T, V, m, q, w, x, z
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import c
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    bottom_increment,
    group_increment,
    quotient,
)


def summary(expression: sp.Expr) -> dict:
    polynomial = sp.Poly(sp.expand(expression), z, w, c, m, x)
    canonical = "\n".join(
        f"{monomial}:{coefficient}"
        for monomial, coefficient in polynomial.terms()
    )
    coefficients = polynomial.coeffs()
    return {
        "term_count": len(coefficients),
        "degrees_z_w_c_m_x": [int(value) for value in polynomial.degree_list()],
        "negative_coefficient_count": len(
            [value for value in coefficients if value < 0]
        ),
        "minimum_coefficient": int(min(coefficients)),
        "sha256": hashlib.sha256(canonical.encode("utf-8")).hexdigest(),
    }


def factor_summary(expression: sp.Expr) -> dict:
    constant, factors = sp.factor_list(sp.expand(expression))
    return {
        "constant": str(constant),
        "whole": summary(expression),
        "factors": [
            {
                "multiplicity": int(multiplicity),
                **summary(factor),
                "expression": (
                    str(factor) if summary(factor)["term_count"] <= 100 else None
                ),
            }
            for factor, multiplicity in factors
        ],
    }


def derive(family: str, parity: int, coordinate: str) -> dict:
    d_expression, reserve_expression = (
        group_increment(parity, coordinate)
        if family == "group"
        else bottom_increment(parity, coordinate)
    )
    common = T**3 if family == "group" else q**2 * T**3
    d_reduced = quotient(d_expression, common)
    reserve_reduced = quotient(reserve_expression, common)
    ell = quotient(d_reduced - reserve_reduced, V)
    Q = quotient(reserve_reduced, T**2)
    return {
        "family": family,
        "parity": parity,
        "coordinate": coordinate,
        "L": factor_summary(ell),
        "Q": factor_summary(Q),
    }


def main() -> None:
    records = [
        derive("group", 0, "m"),
        derive("bottom", 1, "x"),
    ]
    report = {"status": "EXACT_SYMBOLIC", "records": records}
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        "reaggregated_factor_structure_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    for record in records:
        print(record["family"])
        for name in ("L", "Q"):
            print(
                name, record[name]["whole"],
                [
                    (factor["multiplicity"], factor["term_count"],
                     factor["degrees_z_w_c_m_x"])
                    for factor in record[name]["factors"]
                ],
            )


if __name__ == "__main__":
    main()
