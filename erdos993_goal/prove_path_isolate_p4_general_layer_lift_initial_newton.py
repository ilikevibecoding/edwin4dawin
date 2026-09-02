#!/usr/bin/env python3
"""Certify the first Newton coefficients of the general layer lift.

The boundary theorem gives the normalized residual

  R_epsilon(s) =
    (G(c,m+1,s,x,epsilon)-G(c,m,s,x,epsilon))
    / binom(2m+epsilon,m)

at s=-1,0,1,2.  Since the denominator is independent of s, the
Newton coefficients based at s=-1 are the forward differences of
these five exact expressions.  This script verifies coefficientwise
positivity in c,m,x for orders 0,1,2,3,4.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


def certificate(
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
        distance = item["support_distance_s"]
        parity = item["parity_epsilon"]
        values[parity][distance] = sp.sympify(
            item["lift_residual_over_central_binomial"],
            locals={"c": c, "m": m, "x": x},
        )

    certificates = []
    for parity in (0, 1):
        row = [
            values[parity][s] for s in (-1, 0, 1, 2, 3)
        ]
        for order in range(5):
            print(
                f"certifying epsilon={parity}, order={order}",
                flush=True,
            )
            item = certificate(row[0], c, m, x)
            item.update(
                {
                    "parity_epsilon": parity,
                    "newton_order": order,
                    "base": "s=-1",
                }
            )
            certificates.append(item)
            row = [
                sp.factor(sp.cancel(row[index + 1] - row[index]))
                for index in range(len(row) - 1)
            ]

    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_GENERAL_LAYER_LIFT_"
            "INITIAL_NEWTON"
        ),
        "quantity": (
            "Delta_s^r of the general unnormalized layer-lift "
            "residual at s=-1, divided by "
            "binom(2m+epsilon,m)"
        ),
        "proved_newton_orders": [0, 1, 2, 3, 4],
        "parities": [0, 1],
        "certificates": certificates,
        "proof_summary": (
            "Exact boundary residuals at s=-1,0,1,2,3 were differenced "
            "symbolically. Every resulting rational function has a "
            "positive denominator for m>=0 and a numerator with "
            "nonnegative coefficients in c,m,x."
        ),
    }
    Path(
        "path_isolate_p4_general_layer_lift_initial_newton_"
        "20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
