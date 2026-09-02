#!/usr/bin/env python3
"""Audit exact reduced L,Q geometry behind the V-reaggregation."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import A, T, V, m, q, x
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import c, w, z
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    bottom_increment,
    group_increment,
    quotient,
)


def divides(expression: sp.Expr, factor: sp.Expr) -> bool:
    return sp.cancel(expression / factor).is_polynomial()


def polynomial_summary(expression: sp.Expr, variables: tuple[sp.Symbol, ...]) -> dict:
    polynomial = sp.Poly(expression, *variables)
    coefficients = polynomial.coeffs()
    return {
        "term_count": len(coefficients),
        "negative_term_count": len([value for value in coefficients if value < 0]),
        "positive_term_count": len([value for value in coefficients if value > 0]),
        "degree_list": [int(value) for value in polynomial.degree_list()],
        "symmetric_z_w": sp.expand(expression - expression.xreplace({z: w, w: z})) == 0,
        "simple_factors": [
            name
            for name, factor in (
                ("z", z),
                ("w", w),
                ("zw", q),
                ("z+w", z + w),
                ("A", A),
                ("T", T),
                ("V", V),
                ("1+z", 1 + z),
                ("1+w", 1 + w),
            )
            if divides(expression, factor)
        ],
    }


def evaluated_row_geometry(expression: sp.Expr, substitutions: dict) -> dict:
    polynomial = sp.Poly(sp.expand(expression.subs(substitutions)), z, w)
    rows: dict[int, list[tuple[int, int]]] = {}
    for (pz, pw), coefficient in polynomial.terms():
        rows.setdefault(pz + pw, []).append((pz, int(coefficient)))
    maximum_transitions = 0
    transition_rows = []
    for degree, entries in rows.items():
        signs = [
            coefficient > 0
            for _, coefficient in sorted(entries)
            if coefficient
        ]
        transitions = sum(
            signs[index] != signs[index - 1]
            for index in range(1, len(signs))
        )
        maximum_transitions = max(maximum_transitions, transitions)
        if transitions:
            transition_rows.append({"degree": degree, "transitions": transitions})
    return {
        "term_count": len(polynomial.terms()),
        "negative_term_count": len(
            [value for value in polynomial.coeffs() if value < 0]
        ),
        "maximum_homogeneous_row_sign_transitions": maximum_transitions,
        "first_transition_rows": sorted(transition_rows, key=lambda item: item["degree"])[:12],
    }


def main() -> None:
    records = []
    for package, directions in (("group", ("x", "c", "m")), ("bottom", ("x", "m"))):
        variables = (z, w, c, m, x) if package == "group" else (z, w, m, x)
        for parity in (0, 1):
            for coordinate in directions:
                d_expression, reserve_expression = (
                    group_increment(parity, coordinate)
                    if package == "group"
                    else bottom_increment(parity, coordinate)
                )
                common = T**3 if package == "group" else q**2 * T**3
                d_reduced = quotient(d_expression, common)
                reserve_reduced = quotient(reserve_expression, common)
                ell = quotient(d_reduced - reserve_reduced, V)
                q_kernel = quotient(reserve_reduced, T**2)
                assert sp.expand(d_reduced - V * ell - T**2 * q_kernel) == 0
                substitutions = {m: 60, x: 120}
                if package == "group":
                    substitutions[c] = 1
                record = {
                    "package": package,
                    "parity": parity,
                    "coordinate": coordinate,
                    "L": polynomial_summary(ell, variables),
                    "Q": polynomial_summary(q_kernel, variables),
                    "L_at_c1_m60_x120": evaluated_row_geometry(ell, substitutions),
                    "Q_at_c1_m60_x120": evaluated_row_geometry(q_kernel, substitutions),
                }
                records.append(record)
                print(
                    package,
                    parity,
                    coordinate,
                    record["L"]["term_count"],
                    record["L"]["negative_term_count"],
                    record["L_at_c1_m60_x120"]["maximum_homogeneous_row_sign_transitions"],
                    record["Q"]["negative_term_count"],
                    flush=True,
                )
    report = {
        "status": "PASS_EXACT_REAGGREGATED_KERNEL_IDENTITY",
        "records": records,
        "warning": "Geometry audit only; no positivity theorem is inferred.",
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_reaggregated_v_"
        "kernel_geometry_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "case_count": len(records)}, indent=2))


if __name__ == "__main__":
    main()
