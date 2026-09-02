#!/usr/bin/env python3
"""Prove the stable P4 bottom group h=0 at its first supported rank.

Write the input layer as j=2m+epsilon, epsilon in {0,1}.  The h=0
fixed-intersection group is

    H_q^L(j,0) = sum_(u=0)^j binom(j,u) Q_q^L(u,j-u).

It vanishes for q<m+2.  At q=m+2 and L=2q-4+x=2m+x, the path-rank
support leaves only eight terms when epsilon=0 and seven terms when
epsilon=1.  This script simplifies those finite sums exactly and
certifies the resulting positive formulas.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_path_isolate_p4_symbolic_kernel import (
    distinguished_kernel,
)
from stress_path_isolate_p4_cross_polarizations import term_specs


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


def canonical_hash(poly: sp.Poly) -> str:
    canonical = "\n".join(
        f"{monomial}:{coefficient}"
        for monomial, coefficient in poly.terms()
    )
    return hashlib.sha256(
        canonical.encode("utf-8")
    ).hexdigest()


def main() -> None:
    m, x, k = sp.symbols(
        "m x k", integer=True, nonnegative=True
    )

    # Largest residual-path-rank offsets, relative to q-a, in an
    # original/unselected terminal state.  A selected state lowers
    # every offset by one, so it cannot enlarge the support.
    offset = {
        "N": 0,
        "S": 1,
        "H": 2,
        "C": 1,
        "X": 0,
        "Y": 0,
        "HX": 1,
        "m": -1,
        "T": 0,
        "J2": 1,
        "D": 0,
        "p": -2,
        "U": -1,
        "K2": 0,
        "E": -1,
    }
    left_maximum = max(
        offset[left]
        for _, left, _ in term_specs(sp.Symbol("q"))
    )
    right_maximum = max(
        offset[right]
        for _, _, right in term_specs(sp.Symbol("q"))
    )
    assert (left_maximum, right_maximum) == (1, 2)

    # Even layer j=2m.  Put u=m+v.  The left and right support
    # inequalities u<=q+1 and 2m-u<=q+2 give -4<=v<=3.
    even = sp.Integer(0)
    for v in range(-4, 4):
        a = m + v
        b = m - v
        even += (
            sp.binomial(2 * m, a)
            * distinguished_kernel(
                m + 2, 2 * m + x, a, b
            )
        )
    even = simplify_exact(even)
    even_ratio = simplify_exact(
        even / sp.binomial(2 * m, m)
    )
    expected_even_ratio = (
        4
        * (
            12 * m**3
            + 4 * m**2 * x
            - 6 * m**2
            + 6 * m * x
            + 33 * m
            + 2 * x
            + 9
        )
        / ((m + 1) * (m + 2))
    )
    assert simplify_exact(
        even_ratio - expected_even_ratio
    ) == 0
    even_positive_numerator = sp.Poly(
        sp.expand(
            (
                sp.fraction(expected_even_ratio)[0] / 4
            ).subs(m, k + 3)
        ),
        k,
        x,
    )
    assert all(
        coefficient > 0
        for _, coefficient in even_positive_numerator.terms()
    )

    # Odd layer j=2m+1.  With u=m+v, its support is -3<=v<=3.
    odd = sp.Integer(0)
    for v in range(-3, 4):
        a = m + v
        b = m + 1 - v
        odd += (
            sp.binomial(2 * m + 1, a)
            * distinguished_kernel(
                m + 2, 2 * m + x, a, b
            )
        )
    odd = simplify_exact(odd)
    odd_ratio = simplify_exact(
        odd / sp.binomial(2 * m + 1, m)
    )
    expected_odd_ratio = 8 * (m + 1) / (m + 2)
    assert simplify_exact(
        odd_ratio - expected_odd_ratio
    ) == 0

    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_BOTTOM_EDGE_MINIMAL_RANK"
        ),
        "group_definition": (
            "H_q^L(j,0)=sum_(u=0)^j binom(j,u)"
            " Q_q^L(u,j-u)"
        ),
        "domain": (
            "m>=3, epsilon in {0,1}, j=2m+epsilon, "
            "q=m+2, L=2q-4+x=2m+x, x>=0"
        ),
        "lower_rank_zero_range": "q<m+2",
        "support_audit": {
            "largest_left_residual_rank_offset": left_maximum,
            "largest_right_residual_rank_offset": right_maximum,
            "even_surviving_v": "-4..3 for u=m+v",
            "odd_surviving_v": "-3..3 for u=m+v",
        },
        "even_formula": (
            "H_(m+2)^(2m+x)(2m,0)/binom(2m,m) = "
            + str(expected_even_ratio)
        ),
        "even_shift": "m=3+k",
        "even_shifted_positive_numerator_without_factor_4": str(
            even_positive_numerator.as_expr()
        ),
        "even_shifted_numerator_degree_k_x": list(
            even_positive_numerator.degree_list()
        ),
        "even_shifted_numerator_term_count": len(
            even_positive_numerator.terms()
        ),
        "even_smallest_shifted_numerator_coefficient": min(
            int(coefficient)
            for _, coefficient
            in even_positive_numerator.terms()
        ),
        "even_shifted_numerator_sha256": canonical_hash(
            even_positive_numerator
        ),
        "odd_formula": (
            "H_(m+2)^(2m+x)(2m+1,0)/binom(2m+1,m) = "
            + str(expected_odd_ratio)
        ),
        "proof_summary": (
            "The coordinate support of Q reduces each binomial "
            "sum to a fixed finite window. Exact simplification "
            "gives the displayed formulas. The odd formula is "
            "manifestly positive; after m=3+k every coefficient "
            "of the even numerator is positive."
        ),
    }
    Path(
        "path_isolate_p4_bottom_edge_minimal_rank_20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
