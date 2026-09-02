#!/usr/bin/env python3
"""Audit whether first affine increments are coordinatewise increasing."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import A, T, m, q, x, z, w
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import c
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    bottom_increment,
    group_increment,
)


C, M = sp.symbols("C M")


def summary(expression, package):
    shifted = expression.subs(m, M + 3)
    variables = (z, w, M, x)
    if package == "group":
        shifted = shifted.subs(c, C + 1)
        variables = (z, w, C, M, x)
    polynomial = sp.Poly(sp.expand(shifted), *variables)
    negative = [
        (monomial, coefficient)
        for monomial, coefficient in polynomial.terms()
        if coefficient < 0
    ]
    return {
        "term_count": len(polynomial.terms()),
        "negative_term_count": len(negative),
        "minimum_coefficient": str(min(polynomial.coeffs())),
        "degree_list": [int(value) for value in polynomial.degree_list()],
        "first_negative": [
            {"monomial": list(monomial), "coefficient": str(coefficient)}
            for monomial, coefficient in negative[:10]
        ],
    }


def second_increment(package, coordinate, expression):
    if coordinate == "x":
        return sp.expand(A * expression.subs(x, x + 1) - expression)
    if coordinate == "c":
        return sp.expand(A**2 * expression.subs(c, c + 1) - expression)
    return sp.expand(A * T**2 * expression.subs(m, m + 1) - q * expression)


def main() -> None:
    records = []
    for package, directions in (("group", ("x", "c", "m")), ("bottom", ("x", "m"))):
        for parity in (0, 1):
            for coordinate in directions:
                d_expression, reserve_expression = (
                    group_increment(parity, coordinate)
                    if package == "group"
                    else bottom_increment(parity, coordinate)
                )
                d_second = second_increment(package, coordinate, d_expression)
                reserve_second = second_increment(
                    package, coordinate, reserve_expression
                )
                record = {
                    "package": package,
                    "parity": parity,
                    "coordinate": coordinate,
                    "second_base": summary(d_second, package),
                    "second_reserve": summary(reserve_second, package),
                }
                records.append(record)
                print(
                    package,
                    parity,
                    coordinate,
                    record["second_base"]["negative_term_count"],
                    record["second_reserve"]["negative_term_count"],
                    flush=True,
                )
    report = {
        "status": "PASS_COEFFICIENTWISE_SECOND_INCREMENTS"
        if all(
            not record["second_base"]["negative_term_count"]
            and not record["second_reserve"]["negative_term_count"]
            for record in records
        )
        else "SECOND_INCREMENT_NOT_COEFFICIENTWISE_POSITIVE",
        "records": records,
        "warning": (
            "Coefficientwise positivity would be sufficient; a failure does not "
            "rule out central-coefficient convexity."
        ),
    }
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_second_increments_"
        "analysis_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "case_count": len(records)}, indent=2))


if __name__ == "__main__":
    main()
