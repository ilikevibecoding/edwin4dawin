#!/usr/bin/env python3
"""Probe coefficient signs of higher scaled parameter increments.

The first affine increment is the current positivity target.  Reapplying
the same scaled parameter-difference operator produces its second,
third, ... increments.  If a low higher order becomes coefficientwise
nonnegative, repeated summation could reduce the unbounded parameter
direction to finitely many boundary layers.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import A, T, m, q, x, z, w
from analyze_path_isolate_p4_group_affine_grouped_tail_symbolic import c
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    bottom_increment,
    group_increment,
)


C, M = sp.symbols("C M", integer=True, nonnegative=True)


def increment(package: str, coordinate: str, expression: sp.Expr) -> sp.Expr:
    if coordinate == "x":
        return sp.expand(A * expression.subs(x, x + 1) - expression)
    if coordinate == "c":
        return sp.expand(A**2 * expression.subs(c, c + 1) - expression)
    return sp.expand(A * T**2 * expression.subs(m, m + 1) - q * expression)


def signs(expression: sp.Expr, package: str) -> dict:
    shifted = expression.subs(m, M + 3)
    variables = (z, w, M, x)
    if package == "group":
        shifted = shifted.subs(c, C + 1)
        variables = (z, w, C, M, x)
    polynomial = sp.Poly(sp.expand(shifted), *variables)
    coefficients = polynomial.coeffs()
    return {
        "term_count": len(coefficients),
        "negative_term_count": sum(1 for value in coefficients if value < 0),
        "minimum_coefficient": str(min(coefficients)),
        "degree_list": [int(value) for value in polynomial.degree_list()],
    }


def audit(package: str, parity: int, coordinate: str, maximum_order: int) -> dict:
    base, reserve = (
        group_increment(parity, coordinate)
        if package == "group"
        else bottom_increment(parity, coordinate)
    )
    records = []
    for order in range(2, maximum_order + 1):
        base = increment(package, coordinate, base)
        reserve = increment(package, coordinate, reserve)
        base_signs = signs(base, package)
        reserve_signs = signs(reserve, package)
        records.append(
            {
                "order": order,
                "base": base_signs,
                "reserve": reserve_signs,
            }
        )
        print(
            package,
            parity,
            coordinate,
            order,
            base_signs["negative_term_count"],
            reserve_signs["negative_term_count"],
            flush=True,
        )
    return {
        "package": package,
        "parity": parity,
        "coordinate": coordinate,
        "orders": records,
        "first_nonnegative_base_order": next(
            (
                record["order"]
                for record in records
                if not record["base"]["negative_term_count"]
            ),
            None,
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--maximum-order", type=int, default=5)
    parser.add_argument("--quick", action="store_true")
    args = parser.parse_args()
    cases = [
        (package, parity, coordinate)
        for package, directions in (("group", ("x", "c", "m")), ("bottom", ("x", "m")))
        for parity in (0, 1)
        for coordinate in directions
    ]
    if args.quick:
        cases = [("group", 0, "x")]
    records = [audit(*case, args.maximum_order) for case in cases]
    report = {
        "status": (
            "HIGHER_INCREMENT_NONNEGATIVE_ORDER_FOUND"
            if any(record["first_nonnegative_base_order"] for record in records)
            else "NO_NONNEGATIVE_HIGHER_INCREMENT_IN_TESTED_ORDERS"
        ),
        "maximum_order": args.maximum_order,
        "records": records,
        "warning": (
            "Coefficientwise higher-increment positivity would still require "
            "boundary-layer positivity before repeated summation."
        ),
    }
    suffix = "quick_" if args.quick else ""
    Path(
        "path_isolate_p4_affine_parameter_monotonicity_"
        f"higher_increments_{suffix}probe_20260802.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "records"}, indent=2))


if __name__ == "__main__":
    main()
