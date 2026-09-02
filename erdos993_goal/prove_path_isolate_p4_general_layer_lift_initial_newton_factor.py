#!/usr/bin/env python3
"""Certify initial coefficients after the common Newton factor.

Write the normalized Newton polynomial as

  F_epsilon(z)=sum_r A_(epsilon,r) z^r.

The exact stress pattern predicts divisibility by
(1+z)^E, E=2c+2m+x-1, with a nonnegative quotient.  From the first
four proved coefficients A_0,...,A_3, this script computes the first
four formal quotient coefficients and certifies their positivity by
an ordinary positive-coefficient polynomial certificate.  The next
coefficient is positive in the exact numerical sweeps but needs a
more refined basis than ordinary monomials.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


def positive_certificate(
    expression: sp.Expr,
    c: sp.Symbol,
    m: sp.Symbol,
    x: sp.Symbol,
) -> dict:
    reduced = sp.factor(sp.cancel(expression))
    numerator, denominator = map(
        sp.factor, sp.fraction(reduced)
    )
    polynomial = sp.Poly(sp.expand(numerator), c, m, x)
    terms = polynomial.terms()
    negative = [
        (monomial, coefficient)
        for monomial, coefficient in terms
        if coefficient < 0
    ]
    assert not negative
    canonical = "\n".join(
        f"{monomial}:{coefficient}"
        for monomial, coefficient in terms
    )
    return {
        "positive_denominator": str(denominator),
        "numerator_degree_c_m_x": list(
            polynomial.degree_list()
        ),
        "numerator_term_count": len(terms),
        "smallest_numerator_coefficient": min(
            int(coefficient) for _, coefficient in terms
        ),
        "negative_numerator_coefficient_count": len(negative),
        "numerator_sha256": hashlib.sha256(
            canonical.encode("utf-8")
        ).hexdigest(),
    }


def main() -> None:
    c, m, x = sp.symbols(
        "c m x", integer=True, nonnegative=True
    )
    source = json.loads(
        Path(
            "path_isolate_p4_general_layer_lift_boundary_"
            "s3_20260730.json"
        ).read_text(encoding="utf-8")
    )
    values = {0: {}, 1: {-1: sp.Integer(0)}}
    for item in source["certificates"]:
        values[item["parity_epsilon"]][
            item["support_distance_s"]
        ] = sp.sympify(
            item["lift_residual_over_central_binomial"],
            locals={"c": c, "m": m, "x": x},
        )

    exponent = 2 * c + 2 * m + x - 1
    records = []
    for parity in (0, 1):
        row = [
            values[parity][s] for s in (-1, 0, 1, 2, 3)
        ]
        newton = []
        for _ in range(4):
            newton.append(sp.factor(sp.cancel(row[0])))
            row = [
                sp.factor(sp.cancel(row[index + 1] - row[index]))
                for index in range(len(row) - 1)
            ]

        quotient = []
        for order, coefficient in enumerate(newton):
            value = coefficient - sum(
                sp.binomial(exponent, shift)
                * quotient[order - shift]
                for shift in range(1, order + 1)
            )
            value = sp.factor(
                sp.cancel(sp.expand_func(value))
            )
            print(
                f"certifying epsilon={parity}, "
                f"quotient order={order}",
                flush=True,
            )
            item = positive_certificate(value, c, m, x)
            item.update(
                {
                    "parity_epsilon": parity,
                    "quotient_order": order,
                }
            )
            records.append(item)
            quotient.append(value)

    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_GENERAL_LAYER_LIFT_"
            "INITIAL_NEWTON_FACTOR"
        ),
        "factor": "(1+z)^(2c+2m+x-1)",
        "proved_formal_quotient_orders": [0, 1, 2, 3],
        "certificates": records,
        "proof_summary": (
            "The first four proved Newton coefficients were divided "
            "formally by the predicted common binomial factor. Every "
            "resulting rational coefficient has a positive "
            "denominator and a numerator with nonnegative "
            "coefficients in c,m,x."
        ),
    }
    Path(
        "path_isolate_p4_general_layer_lift_initial_newton_"
        "factor_20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
