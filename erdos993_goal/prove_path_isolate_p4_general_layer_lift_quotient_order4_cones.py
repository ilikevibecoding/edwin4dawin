#!/usr/bin/env python3
"""Certify the fifth formal quotient coefficient on c+m >= 4.

Let

  F_e(z) = sum_{r>=0} A_{e,r} z^r

be the Newton-coefficient polynomial of the normalized two-layer lift
residual, based at support distance s=-1.  Exact experiments predict

  F_e(z) = (1+z)^(2c+2m+x-1) P_e(z)

with P_e coefficientwise nonnegative.  The first four coefficients of
P_e have global positive-monomial certificates.  The fifth one does
not in the unshifted variables, although its values are positive.

The application has c+m >= 4.  This script partitions that domain into
the five disjoint cones

  c=0, m=4+M; ...; c=3, m=1+M; c=4+C, m=M,

and checks the numerator of [z^4]P_e in ordinary monomials on each
cone.  Nonnegative coefficients on all ten parity/cone cases are an
exact positivity certificate for the whole admissible domain.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


def load_boundary_values(
    c: sp.Symbol,
    m: sp.Symbol,
    x: sp.Symbol,
) -> dict[int, dict[int, sp.Expr]]:
    source = json.loads(
        Path(
            "path_isolate_p4_general_layer_lift_boundary_"
            "s3_20260730.json"
        ).read_text(encoding="utf-8")
    )
    values: dict[int, dict[int, sp.Expr]] = {
        0: {},
        1: {-1: sp.Integer(0)},
    }
    for item in source["certificates"]:
        values[item["parity_epsilon"]][
            item["support_distance_s"]
        ] = sp.sympify(
            item["lift_residual_over_central_binomial"],
            locals={"c": c, "m": m, "x": x},
        )
    return values


def fifth_quotient_coefficient(
    values: dict[int, sp.Expr],
    exponent: sp.Expr,
) -> sp.Expr:
    row = [values[s] for s in (-1, 0, 1, 2, 3)]
    newton: list[sp.Expr] = []
    for _ in range(5):
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
    return quotient[4]


def cone_certificate(
    expression: sp.Expr,
    substitution: dict[sp.Symbol, sp.Expr],
    variables: tuple[sp.Symbol, ...],
) -> dict:
    shifted = sp.factor(
        sp.cancel(expression.subs(substitution))
    )
    numerator, denominator = map(
        sp.factor, sp.fraction(shifted)
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
        "substitution": {
            str(symbol): str(value)
            for symbol, value in substitution.items()
        },
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
    values = load_boundary_values(c, m, x)
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

    records = []
    total_negative = 0
    for parity in (0, 1):
        print(
            f"forming epsilon={parity} quotient coefficient",
            flush=True,
        )
        coefficient = fifth_quotient_coefficient(
            values[parity], exponent
        )
        for cone_name, substitution, variables in cones:
            print(
                f"certifying epsilon={parity}, cone={cone_name}",
                flush=True,
            )
            record = cone_certificate(
                coefficient, substitution, variables
            )
            record.update(
                {
                    "parity_epsilon": parity,
                    "quotient_order": 4,
                    "cone": cone_name,
                }
            )
            total_negative += record[
                "negative_numerator_coefficient_count"
            ]
            records.append(record)

    passed = total_negative == 0
    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_GENERAL_LAYER_LIFT_"
            "QUOTIENT_ORDER4_CONES"
            if passed
            else
            "FAIL_PATH_ISOLATE_P4_GENERAL_LAYER_LIFT_"
            "QUOTIENT_ORDER4_CONES"
        ),
        "quantity": (
            "coefficient of z^4 after formal division of the "
            "Newton polynomial by "
            "(1+z)^(2c+2m+x-1)"
        ),
        "domain": "c,m,x>=0 and c+m>=4",
        "cone_partition": [
            "c=0,m=4+M",
            "c=1,m=3+M",
            "c=2,m=2+M",
            "c=3,m=1+M",
            "c=4+C,m=M",
        ],
        "total_negative_numerator_coefficient_count": total_negative,
        "certificates": records,
        "proof_summary": (
            "The admissible parameter domain was partitioned into "
            "five nonnegative-coordinate cones. On each cone and for "
            "both parities, the exact rational fifth quotient "
            "coefficient was expanded in ordinary monomials."
        ),
    }
    output = Path(
        "path_isolate_p4_general_layer_lift_quotient_"
        "order4_cones_20260730.json"
    )
    output.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    if not passed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
