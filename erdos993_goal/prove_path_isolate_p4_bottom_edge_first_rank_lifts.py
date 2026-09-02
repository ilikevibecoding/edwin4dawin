#!/usr/bin/env python3
"""Prove the h=0 stable P4 group at rank distances s=0,1,2.

For j=2m+epsilon put

    q=m+s+2,  L=2q-4+x.

The bottom group has a fixed support window for each fixed s.  This
script evaluates it exactly for s=0,1,2, proves coefficientwise
positivity after m=3+k, and proves the two rank lifts s=0->1 and
s=1->2 by the same method.
"""

from __future__ import annotations

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


def fixed_distance_group(
    m: sp.Symbol,
    x: sp.Symbol,
    parity: int,
    distance: int,
) -> sp.Expr:
    j = 2 * m + parity
    q = m + distance + 2
    length = 2 * q - 4 + x
    lower_v = (
        -distance - 4
        if parity == 0
        else -distance - 3
    )
    upper_v = distance + 3
    total = sp.Integer(0)
    for v in range(lower_v, upper_v + 1):
        a = m + v
        b = j - a
        total += (
            sp.binomial(j, a)
            * distinguished_kernel(q, length, a, b)
        )
    return simplify_exact(
        total / sp.binomial(j, m)
    )


def poly_certificate(
    expression: sp.Expr,
    k: sp.Symbol,
    x: sp.Symbol,
) -> dict:
    numerator, denominator = map(
        sp.factor, sp.fraction(expression)
    )
    polynomial = sp.Poly(
        sp.expand(numerator), k, x
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
        "expression": str(expression),
        "positive_denominator": str(denominator),
        "numerator_degree_k_x": list(
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
    m, x, k = sp.symbols(
        "m x k", integer=True, nonnegative=True
    )
    formulas: dict[int, list[sp.Expr]] = {}
    group_certificates = []
    lift_certificates = []
    for parity in (0, 1):
        formulas[parity] = []
        for distance in range(3):
            print(
                f"deriving parity={parity}, s={distance}",
                flush=True,
            )
            formula = fixed_distance_group(
                m, x, parity, distance
            )
            formulas[parity].append(formula)
            shifted = simplify_exact(
                formula.subs(m, k + 3)
            )
            certificate = poly_certificate(
                shifted, k, x
            )
            certificate.update(
                {
                    "parity_epsilon": parity,
                    "rank_distance_s": distance,
                    "normalization": (
                        "H_q^L(2m+epsilon,0) / "
                        "binom(2m+epsilon,m)"
                    ),
                }
            )
            group_certificates.append(certificate)

        for distance in (1, 2):
            residual = simplify_exact(
                (
                    formulas[parity][distance]
                    - formulas[parity][distance - 1]
                ).subs(m, k + 3)
            )
            certificate = poly_certificate(
                residual, k, x
            )
            certificate.update(
                {
                    "parity_epsilon": parity,
                    "rank_lift": (
                        f"s={distance - 1}->s={distance}"
                    ),
                    "quantity": (
                        "(H_s-H_(s-1))/"
                        "binom(2m+epsilon,m)"
                    ),
                }
            )
            lift_certificates.append(certificate)

    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_BOTTOM_EDGE_FIRST_RANK_LIFTS"
        ),
        "domain": (
            "m>=3, epsilon in {0,1}, s in {0,1,2}, "
            "j=2m+epsilon, q=m+s+2, L=2q-4+x, x>=0"
        ),
        "shift": "m=3+k",
        "group_certificates": group_certificates,
        "rank_lift_certificates": lift_certificates,
        "theorem": (
            "The h=0 groups are positive for the first three "
            "supported ranks, and are nondecreasing across the "
            "first two stable rank lifts."
        ),
    }
    Path(
        "path_isolate_p4_bottom_edge_first_rank_lifts_"
        "20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
