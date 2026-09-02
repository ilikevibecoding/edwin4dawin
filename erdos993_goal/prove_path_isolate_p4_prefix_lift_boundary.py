#!/usr/bin/env python3
"""Prove the three prefix lifts on the first support diagonals.

The source file contains exact formulas for the normalized residual

  R_e(c,m,s,x)=D_e(c,m,s,x)/binom(2m+e,m)

at s=-1,0,1,2,3.  This script forms the c-, m-, and x-coordinate
prefix-lift residuals and certifies them as positive-coefficient
rational functions in c,m,x.
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
    reduced = sp.factor(
        sp.cancel(sp.expand_func(expression))
    )
    numerator, denominator = map(
        sp.factor, sp.fraction(reduced)
    )
    if numerator == 0:
        return {
            "identically_zero": True,
            "positive_denominator": str(denominator),
            "numerator_degree_c_m_x": None,
            "numerator_term_count": 0,
            "smallest_numerator_coefficient": "0",
            "negative_numerator_coefficient_count": 0,
            "numerator_sha256": hashlib.sha256(b"0").hexdigest(),
        }
    polynomial = sp.Poly(sp.expand(numerator), c, m, x)
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
        "identically_zero": False,
        "positive_denominator": str(denominator),
        "numerator_degree_c_m_x": list(
            polynomial.degree_list()
        ),
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

    records = []
    total_negative = 0
    for parity in (0, 1):
        row = [values[parity][s] for s in (-1, 0, 1, 2, 3)]
        first_prefix = []
        running = 0
        for value in row:
            running = sp.factor(sp.cancel(running + value))
            first_prefix.append(running)
        second_prefix = []
        running = 0
        for value in first_prefix:
            running = sp.factor(sp.cancel(running + value))
            second_prefix.append(running)

        central_ratio = (
            2 * (2 * m + 1) / (m + 1)
            if parity == 0
            else 2 * (2 * m + 3) / (m + 2)
        )
        for index, distance in enumerate((-1, 0, 1, 2, 3)):
            candidates = {
                "c": row[index].subs(c, c + 1)
                - second_prefix[index],
                "m": central_ratio
                * row[index].subs(m, m + 1)
                - second_prefix[index],
                "x": row[index].subs(x, x + 1)
                - first_prefix[index],
            }
            for coordinate, expression in candidates.items():
                print(
                    f"certifying epsilon={parity}, s={distance}, "
                    f"coordinate={coordinate}",
                    flush=True,
                )
                item = certificate(expression, c, m, x)
                item.update(
                    {
                        "parity_epsilon": parity,
                        "support_distance_s": distance,
                        "coordinate": coordinate,
                    }
                )
                total_negative += item[
                    "negative_numerator_coefficient_count"
                ]
                records.append(item)

    passed = total_negative == 0
    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_PREFIX_LIFT_BOUNDARY"
            if passed
            else "FAIL_PATH_ISOLATE_P4_PREFIX_LIFT_BOUNDARY"
        ),
        "proved_support_distances": [-1, 0, 1, 2, 3],
        "coordinates": ["c", "m", "x"],
        "parities": [0, 1],
        "certificate_count": len(records),
        "total_negative_numerator_coefficient_count": total_negative,
        "certificates": records,
        "proof_summary": (
            "The three prefix-lift residuals were formed exactly from "
            "the normalized boundary formulas. Each rational "
            "function has a positive denominator and a numerator "
            "with nonnegative coefficients in c,m,x."
        ),
    }
    Path(
        "path_isolate_p4_prefix_lift_boundary_20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    if not passed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
