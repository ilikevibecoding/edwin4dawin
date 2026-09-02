#!/usr/bin/env python3
"""Prove fixed support diagonals for H(j,0)+H(j,1).

Write j=2m+epsilon, q=m+s+2, and L=2q-4+x.  Normalize the
bottom pair by binom(j,m).  If R(c,m,s,x,e) denotes the normalized
internal group G/binom(2m+e,m), then

  B_0/binom(2m,m)
    = R(0,m,s,x,0) + m R(1,m-1,s,x,1),

  B_1/binom(2m+1,m)
    = R(0,m,s,x,1) + (m+1) R(1,m,s-1,x,0).

The script derives these rational functions exactly and tests both
their positivity and the unnormalized two-layer lift in m after the
shift m=3+k.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from prove_path_isolate_p4_general_layer_lift_boundary import (
    normalized_group,
    simplify_exact,
)


def certificate(
    expression: sp.Expr,
    k_value: sp.Symbol,
    x_value: sp.Symbol,
) -> dict:
    numerator, denominator = map(
        sp.factor, sp.fraction(expression)
    )
    polynomial = sp.Poly(
        sp.expand(numerator), k_value, x_value
    )
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
        "expression": str(expression),
        "denominator": str(denominator),
        "degree_k_x": list(polynomial.degree_list()),
        "nonzero_term_count": len(terms),
        "negative_coefficient_count": len(negative),
        "smallest_coefficient": (
            min(int(coefficient) for _, coefficient in terms)
            if terms
            else None
        ),
        "first_negative_terms": [
            {
                "monomial_k_x": list(monomial),
                "coefficient": str(coefficient),
            }
            for monomial, coefficient in negative[:30]
        ],
        "numerator_sha256": hashlib.sha256(
            canonical.encode("utf-8")
        ).hexdigest(),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--min-distance", type=int, default=6)
    parser.add_argument("--max-distance", type=int, default=6)
    args = parser.parse_args()
    if args.min_distance < 0:
        raise ValueError("min-distance must be nonnegative")
    if args.max_distance < args.min_distance:
        raise ValueError("max-distance must be >= min-distance")

    m_value, k_value, x_value = sp.symbols(
        "m k x", integer=True, nonnegative=True
    )
    records = []
    failure_count = 0
    for distance in range(
        args.min_distance, args.max_distance + 1
    ):
        for parity in (0, 1):
            print(
                f"deriving pair epsilon={parity}, s={distance}",
                flush=True,
            )
            if parity == 0:
                pair = simplify_exact(
                    normalized_group(
                        sp.Integer(0),
                        m_value,
                        x_value,
                        0,
                        distance,
                    )
                    + m_value
                    * normalized_group(
                        sp.Integer(1),
                        m_value - 1,
                        x_value,
                        1,
                        distance,
                    )
                )
                central_ratio = (
                    2 * (2 * m_value + 1) / (m_value + 1)
                )
            else:
                pair = simplify_exact(
                    normalized_group(
                        sp.Integer(0),
                        m_value,
                        x_value,
                        1,
                        distance,
                    )
                    + (m_value + 1)
                    * normalized_group(
                        sp.Integer(1),
                        m_value,
                        x_value,
                        0,
                        distance - 1,
                    )
                )
                central_ratio = (
                    2 * (2 * m_value + 3) / (m_value + 2)
                )

            shifted_pair = simplify_exact(
                pair.subs(m_value, k_value + 3)
            )
            pair_certificate = certificate(
                shifted_pair, k_value, x_value
            )

            unnormalized_lift = simplify_exact(
                central_ratio * pair.subs(
                    m_value, m_value + 1
                )
                - pair
            )
            shifted_lift = simplify_exact(
                unnormalized_lift.subs(
                    m_value, k_value + 3
                )
            )
            lift_certificate = certificate(
                shifted_lift, k_value, x_value
            )
            failure_count += (
                pair_certificate["negative_coefficient_count"]
                + lift_certificate["negative_coefficient_count"]
            )
            records.append(
                {
                    "support_distance_s": distance,
                    "parity_epsilon": parity,
                    "normalization": (
                        "B_epsilon(m,s,x)/"
                        "binom(2m+epsilon,m)"
                    ),
                    "pair_certificate": pair_certificate,
                    "unnormalized_layer_lift_certificate": (
                        lift_certificate
                    ),
                }
            )

    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_BOTTOM_PAIR_FIXED_DISTANCES"
            if failure_count == 0
            else "FAIL_PATH_ISOLATE_P4_BOTTOM_PAIR_FIXED_DISTANCES"
        ),
        "domain": (
            f"m>=3, {args.min_distance}<=s<="
            f"{args.max_distance}, x>=0, epsilon in {{0,1}}"
        ),
        "shift": "m=3+k",
        "theorem_if_pass": (
            "H(j,0)+H(j,1)>=0 and its unnormalized two-layer "
            "m-lift is nonnegative on every listed support diagonal"
        ),
        "negative_coefficient_count": failure_count,
        "records": records,
    }
    Path(
        "path_isolate_p4_bottom_pair_fixed_distances_"
        f"s{args.min_distance}_to_{args.max_distance}_20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))
    if failure_count:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
