#!/usr/bin/env python3
"""Certify Newton and factored-quotient order five.

This combines the exact boundary residuals at s=-1,...,4, takes the
fifth forward difference, and then formally divides the Newton series
by (1+z)^(2c+2m+x-1).  It tests:

1. global positive-monomial positivity of the fifth Newton
   coefficient; and
2. positive-monomial positivity of the fifth quotient coefficient on
   each of the five cones partitioning c+m>=4.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp
from sympy.functions.combinatorial.factorials import (
    FallingFactorial as FF,
)


def interpolated_s4_values(
    c: sp.Symbol,
    m: sp.Symbol,
    x: sp.Symbol,
) -> dict[int, sp.Expr]:
    source = json.loads(
        Path(
            "path_isolate_p4_boundary_s4_newton_"
            "interpolation_20260730.json"
        ).read_text(encoding="utf-8")
    )
    result = {}
    for report in source["reports"]:
        parity = report["parity_epsilon"]
        numerator = 0
        for item in report["coefficients"]:
            order_c, order_m, order_x = item["orders_c_m_x"]
            coefficient = sp.Rational(
                item["numerator"], item["denominator"]
            )
            numerator += (
                coefficient
                * FF(c, order_c)
                / sp.factorial(order_c)
                * FF(m, order_m)
                / sp.factorial(order_m)
                * FF(x, order_x)
                / sp.factorial(order_x)
            )
        first = 1 if parity == 0 else 2
        denominator = sp.prod(
            m + shift for shift in range(first, 10)
        )
        result[parity] = sp.factor(numerator / denominator)
    return result


def load_values(
    c: sp.Symbol,
    m: sp.Symbol,
    x: sp.Symbol,
) -> dict[int, dict[int, sp.Expr]]:
    values: dict[int, dict[int, sp.Expr]] = {
        0: {},
        1: {-1: sp.Integer(0)},
    }
    for path in (
        Path(
            "path_isolate_p4_general_layer_lift_boundary_"
            "s3_20260730.json"
        ),
    ):
        source = json.loads(path.read_text(encoding="utf-8"))
        for item in source["certificates"]:
            parity = item["parity_epsilon"]
            distance = item["support_distance_s"]
            values[parity][distance] = sp.sympify(
                item[
                    "lift_residual_over_central_binomial"
                ],
                locals={"c": c, "m": m, "x": x},
            )
    for parity, expression in interpolated_s4_values(
        c, m, x
    ).items():
        values[parity][4] = expression
    return values


def newton_and_quotient(
    values: dict[int, sp.Expr],
    exponent: sp.Expr,
) -> tuple[list[sp.Expr], list[sp.Expr]]:
    row = [values[s] for s in (-1, 0, 1, 2, 3, 4)]
    newton: list[sp.Expr] = []
    for _ in range(6):
        newton.append(sp.factor(sp.cancel(row[0])))
        row = [
            sp.factor(sp.cancel(row[index + 1] - row[index]))
            for index in range(len(row) - 1)
        ]
    quotient: list[sp.Expr] = []
    for order, coefficient in enumerate(newton):
        value = coefficient - sum(
            sp.binomial(exponent, shift)
            * quotient[order - shift]
            for shift in range(1, order + 1)
        )
        quotient.append(
            sp.factor(sp.cancel(sp.expand_func(value)))
        )
    return newton, quotient


def polynomial_certificate(
    expression: sp.Expr,
    variables: tuple[sp.Symbol, ...],
) -> dict:
    reduced = sp.factor(sp.cancel(expression))
    numerator, denominator = map(
        sp.factor, sp.fraction(reduced)
    )
    polynomial = sp.Poly(sp.expand(numerator), *variables)
    terms = polynomial.terms()
    negative = [
        (monomial, coefficient)
        for monomial, coefficient in terms
        if coefficient < 0
    ]
    canonical = "\n".join(
        f"{monomial}:{coefficient}"
        for monomial, coefficient in terms
    )
    return {
        "positive_denominator": str(denominator),
        "numerator_degree_list": list(polynomial.degree_list()),
        "numerator_term_count": len(terms),
        "smallest_numerator_coefficient": str(
            min(coefficient for _, coefficient in terms)
        ),
        "negative_numerator_coefficient_count": len(negative),
        "first_negative_terms": [
            {
                "monomial": list(monomial),
                "coefficient": str(coefficient),
            }
            for monomial, coefficient in negative[:20]
        ],
        "numerator_sha256": hashlib.sha256(
            canonical.encode("utf-8")
        ).hexdigest(),
    }


def main() -> None:
    c, m, x = sp.symbols(
        "c m x", integer=True, nonnegative=True
    )
    capital_c, capital_m = sp.symbols(
        "C M", integer=True, nonnegative=True
    )
    values = load_values(c, m, x)
    exponent = 2 * c + 2 * m + x - 1
    cones = [
        ("c=0", {c: 0, m: 4 + capital_m}, (capital_m, x)),
        ("c=1", {c: 1, m: 3 + capital_m}, (capital_m, x)),
        ("c=2", {c: 2, m: 2 + capital_m}, (capital_m, x)),
        ("c=3", {c: 3, m: 1 + capital_m}, (capital_m, x)),
        (
            "c>=4",
            {c: 4 + capital_c, m: capital_m},
            (capital_c, capital_m, x),
        ),
    ]

    raw_records = []
    cone_records = []
    raw_negative = 0
    quotient_negative = 0
    for parity in (0, 1):
        print(
            f"forming order-five expressions, epsilon={parity}",
            flush=True,
        )
        newton, quotient = newton_and_quotient(
            values[parity], exponent
        )
        print(
            f"certifying raw Newton order five, epsilon={parity}",
            flush=True,
        )
        raw = polynomial_certificate(
            newton[5], (c, m, x)
        )
        raw["parity_epsilon"] = parity
        raw["newton_order"] = 5
        raw_negative += raw[
            "negative_numerator_coefficient_count"
        ]
        raw_records.append(raw)

        for cone_name, substitution, variables in cones:
            print(
                f"certifying quotient order five, "
                f"epsilon={parity}, cone={cone_name}",
                flush=True,
            )
            certificate = polynomial_certificate(
                quotient[5].subs(substitution), variables
            )
            certificate.update(
                {
                    "parity_epsilon": parity,
                    "quotient_order": 5,
                    "cone": cone_name,
                    "substitution": {
                        str(symbol): str(value)
                        for symbol, value
                        in substitution.items()
                    },
                }
            )
            quotient_negative += certificate[
                "negative_numerator_coefficient_count"
            ]
            cone_records.append(certificate)

    passed = raw_negative == 0 and quotient_negative == 0
    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_GENERAL_LAYER_LIFT_ORDER5"
            if passed
            else "FAIL_PATH_ISOLATE_P4_GENERAL_LAYER_LIFT_ORDER5"
        ),
        "newton_order": 5,
        "quotient_factor": "(1+z)^(2c+2m+x-1)",
        "quotient_domain": "c,m,x>=0 and c+m>=4",
        "raw_negative_numerator_coefficient_count": raw_negative,
        "quotient_negative_numerator_coefficient_count": (
            quotient_negative
        ),
        "raw_newton_certificates": raw_records,
        "quotient_cone_certificates": cone_records,
        "proof_summary": (
            "The exact residuals at s=-1,...,4 were differenced "
            "symbolically. Newton order five was checked globally, "
            "and formal quotient order five was checked on the five "
            "cones partitioning c+m>=4."
        ),
    }
    Path(
        "path_isolate_p4_general_layer_lift_order5_"
        "20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    if not passed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
