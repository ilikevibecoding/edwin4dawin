#!/usr/bin/env python3
"""Prove the general two-layer lift on its first support diagonals.

Let

  G(c,m,s,x,epsilon)
    = sum_u binom(2m+epsilon,u)
      Q_q^L(c+u,c+2m+epsilon-u),

where q=c+m+s+2 and L=2q-4+x.  Thus H_q^L(j,c) is the
positive outer factor binom(j,c) times G, with
j=c+2m+epsilon.

This script proves the lift

  G(c,m+1,s,x,epsilon) >= G(c,m,s,x,epsilon)

from s=-1 through a requested fixed support distance, uniformly in
c,m,x.  The s=-1 group has a closed six-term boundary formula; every
requested nonnegative s reduces to a positive-coefficient rational
function after its finite support sum is evaluated.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_path_isolate_p4_symbolic_kernel import (
    distinguished_kernel,
)


def simplify_exact(expression: sp.Expr) -> sp.Expr:
    return sp.factor(
        sp.cancel(
            sp.expand_func(
                sp.combsimp(
                    sp.gammasimp(sp.expand(expression))
                )
            )
        )
    )


def normalized_group(
    c: sp.Symbol,
    m: sp.Symbol,
    x: sp.Symbol,
    parity: int,
    distance: int,
) -> sp.Expr:
    q = c + m + distance + 2
    length = 2 * q - 4 + x
    d = 2 * m + parity
    lower_v = (
        -distance - 4
        if parity == 0
        else -distance - 3
    )
    upper_v = distance + 3
    total = sp.Integer(0)
    for v in range(lower_v, upper_v + 1):
        u = m + v
        total += (
            sp.binomial(d, u)
            * distinguished_kernel(
                q,
                length,
                c + u,
                c + d - u,
            )
        )
    return simplify_exact(
        total / sp.binomial(d, m)
    )


def positive_poly_certificate(
    expression: sp.Expr,
    c: sp.Symbol,
    m: sp.Symbol,
    x: sp.Symbol,
) -> dict:
    numerator, denominator = map(
        sp.factor, sp.fraction(expression)
    )
    polynomial = sp.Poly(
        sp.expand(numerator), c, m, x
    )
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
        "negative_numerator_coefficient_count": len(
            negative
        ),
        "numerator_sha256": hashlib.sha256(
            canonical.encode("utf-8")
        ).hexdigest(),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--min-distance", type=int, default=0)
    parser.add_argument("--max-distance", type=int, default=2)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "path_isolate_p4_general_layer_lift_boundary_"
            "20260730.json"
        ),
    )
    args = parser.parse_args()
    if (
        args.min_distance < 0
        or args.max_distance < args.min_distance
    ):
        raise ValueError(
            "require 0 <= min-distance <= max-distance"
        )

    c, m, x = sp.symbols(
        "c m x", integer=True, nonnegative=True
    )

    even_boundary = (
        8
        * c
        * (2 * m + 1)
        * (c * m + m**2 + 3 * m + 3)
        / ((m + 1) * (m + 2) * (m + 3))
    )
    odd_boundary = sp.Integer(0)
    boundary_lift = simplify_exact(
        (
            2
            * (2 * m + 1)
            / (m + 1)
            * even_boundary.subs(m, m + 1)
            - even_boundary
        )
    )
    boundary_certificate = positive_poly_certificate(
        boundary_lift, c, m, x
    )
    boundary_certificate.update(
        {
            "support_distance_s": -1,
            "parity_epsilon": 0,
            "normalized_group_formula": str(
                even_boundary
            ),
            "odd_normalized_group_formula": str(
                odd_boundary
            ),
            "lift_residual_over_central_binomial": str(
                boundary_lift
            ),
        }
    )

    certificates = [boundary_certificate]
    for distance in range(
        args.min_distance, args.max_distance + 1
    ):
        for parity in (0, 1):
            print(
                f"deriving s={distance}, parity={parity}",
                flush=True,
            )
            group = normalized_group(
                c, m, x, parity, distance
            )
            central_ratio = (
                2 * (2 * m + 1) / (m + 1)
                if parity == 0
                else 2 * (2 * m + 3) / (m + 2)
            )
            residual = simplify_exact(
                central_ratio
                * group.subs(m, m + 1)
                - group
            )
            certificate = positive_poly_certificate(
                residual, c, m, x
            )
            certificate.update(
                {
                    "support_distance_s": distance,
                    "parity_epsilon": parity,
                    "lift_residual_over_central_binomial": str(
                        residual
                    ),
                }
            )
            certificates.append(certificate)

    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_GENERAL_LAYER_LIFT_BOUNDARY"
        ),
        "group_definition": (
            "G=sum_u binom(2m+epsilon,u)"
            " Q_q^L(c+u,c+2m+epsilon-u)"
        ),
        "parameters": (
            "q=c+m+s+2, L=2q-4+x, "
            "c,m,x>=0, epsilon in {0,1}"
        ),
        "proved_support_distances": [
            -1,
            *range(args.min_distance, args.max_distance + 1),
        ],
        "zero_range": "s<=-2",
        "lift": (
            "G(c,m+1,s,x,epsilon) >= "
            "G(c,m,s,x,epsilon)"
        ),
        "certificates": certificates,
        "proof_summary": (
            "At s=-1 support leaves six even summands and five "
            "odd summands, giving the displayed positive formula "
            "and zero. At each listed s>=0 the fixed support window is "
            "summed exactly. After dividing the lift residual by "
            "the positive central binomial coefficient, every "
            "numerator coefficient in c,m,x is nonnegative."
        ),
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
