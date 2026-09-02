#!/usr/bin/env python3
"""Certify positive-intersection multiplicative recurrences through order 5.

All quotient coefficients are put over the common positive denominator
used at order 5.  The c and x recurrences retain that denominator.  In the
m recurrence its shifted-denominator ratio telescopes, leaving the explicit
positive extra denominator m+10.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from fractions import Fraction
from pathlib import Path

import sympy as sp

from prove_path_isolate_p4_general_layer_lift_order5_sparse import (
    Polynomial,
    add,
    certificate,
    common_numerators,
    from_sympy,
    multiply,
    ordinary_to_newton,
    shift_coordinate,
    weight_polynomial,
)


def linear_combination(*items: tuple[Polynomial, int]) -> Polynomial:
    result: Polynomial = {}
    for source, scalar in items:
        add(result, source, Fraction(scalar))
    return result


def quotient_numerators(
    values: list[Polynomial],
    c: sp.Symbol,
    m: sp.Symbol,
    x: sp.Symbol,
) -> list[Polynomial]:
    result = []
    for order in range(len(values)):
        polynomial: Polynomial = {}
        for index in range(order + 1):
            weight = weight_polynomial(
                order,
                (-1) ** (order - index),
                order - index,
                c,
                m,
                x,
            )
            add(polynomial, multiply(values[index], weight))
        result.append(polynomial)
    return result


def shifted_main_cone(polynomial: Polynomial) -> Polynomial:
    return shift_coordinate(shift_coordinate(polynomial, 0, 1), 1, 3)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--order", type=int, default=5)
    args = parser.parse_args()
    maximum_order = args.order
    if maximum_order < 0 or maximum_order > 6:
        raise ValueError("available exact boundary data support orders 0..6")
    c, m, x = sp.symbols("c m x", integer=True, nonnegative=True)
    records = []
    total_negative = 0
    for parity in (0, 1):
        values = common_numerators(maximum_order, parity, c, m, x)
        quotient = quotient_numerators(values, c, m, x)
        m_new_factor = from_sympy(
            2 * (2 * m + 1 + 2 * parity), c, m, x
        )
        m_old_factor = from_sympy(m + maximum_order + 5, c, m, x)
        for order in range(maximum_order + 1):
            previous = quotient[order - 1] if order >= 1 else {}
            previous2 = quotient[order - 2] if order >= 2 else {}
            c_residual = linear_combination(
                (shift_coordinate(quotient[order], 0, 1), 1),
                (quotient[order], -1),
                (previous, -4),
                (previous2, -4),
            )
            x_residual = linear_combination(
                (shift_coordinate(quotient[order], 2, 1), 1),
                (quotient[order], -1),
                (previous, -2),
            )
            old_m_side = linear_combination(
                (quotient[order], 1),
                (previous, 4),
                (previous2, 4),
            )
            m_residual = linear_combination(
                (
                    multiply(
                        shift_coordinate(quotient[order], 1, 1),
                        m_new_factor,
                    ),
                    1,
                ),
                (multiply(old_m_side, m_old_factor), -1),
            )
            for coordinate, residual, denominator in (
                (
                    "c",
                    c_residual,
                    "D_epsilon(m)",
                ),
                (
                    "x",
                    x_residual,
                    "D_epsilon(m)",
                ),
                (
                    "m",
                    m_residual,
                    f"(m+{maximum_order + 5})*D_epsilon(m)",
                ),
            ):
                shifted = shifted_main_cone(residual)
                ordinary = certificate(shifted)
                newton = certificate(ordinary_to_newton(shifted))
                total_negative += ordinary["negative_coefficient_count"]
                item = {
                    "parity_epsilon": parity,
                    "quotient_order": order,
                    "coordinate": coordinate,
                    "domain": "c=1+C, m=3+M, C,M,x>=0",
                    "positive_denominator": denominator,
                    "ordinary_monomial_certificate": ordinary,
                    "tensor_newton_certificate": newton,
                }
                records.append(item)
                print(
                    parity,
                    order,
                    coordinate,
                    ordinary["negative_coefficient_count"],
                    flush=True,
                )
    passed = total_negative == 0
    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_POSITIVE_INTERSECTION_"
            f"INITIAL_MULTIPLICATIVE_ORDER0_TO_{maximum_order}"
            if passed
            else "FAIL_PATH_ISOLATE_P4_POSITIVE_INTERSECTION_"
            f"INITIAL_MULTIPLICATIVE_ORDER0_TO_{maximum_order}"
        ),
        "domain": "c>=1, m>=3, x>=0, both parities",
        "common_denominators": {
            "epsilon_0": f"product(m+i,i=1..{maximum_order + 4})",
            "epsilon_1": f"product(m+i,i=2..{maximum_order + 4})",
        },
        "m_shifted_denominator_identity": {
            "epsilon_0": (
                f"D(m)/D(m+1)=(m+1)/(m+{maximum_order + 5})"
            ),
            "epsilon_1": (
                f"D(m)/D(m+1)=(m+2)/(m+{maximum_order + 5})"
            ),
        },
        "proved_quotient_orders": list(range(maximum_order + 1)),
        "certificate_count": len(records),
        "negative_ordinary_coefficient_count": total_negative,
        "records": records,
    }
    Path(
        "path_isolate_p4_positive_intersection_initial_"
        f"multiplicative_order0_to_{maximum_order}_20260801.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "records"}, indent=2))
    if not passed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
