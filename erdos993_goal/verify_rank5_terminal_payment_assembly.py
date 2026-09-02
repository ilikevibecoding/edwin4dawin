#!/usr/bin/env python3
"""Verify symbolic glue in the terminal-broom rank-5 proof."""

from __future__ import annotations

import sympy as sp

from verify_rank5_leaf_induction_reduction import (
    rooted_payment,
    symbolic_identity,
)
from verify_rank5_normalized_algebra_lemma import (
    D,
    PHI,
    X,
    q,
    r,
    verify_payment_normalization,
)


def structural_normalization() -> None:
    d, e, f, h, k = sp.symbols(
        "d e f h k", positive=True
    )
    q4 = 8 * e**2 - d * e - 10 * d * f
    normalized_D = 1 - d * f / e**2
    D0 = (2 + d / e) / 10
    assert sp.factor(normalized_D - D0 - q4 / (10 * e**2)) == 0

    cross = d * (e**2 - d * f) - 2 * e * (e * h - d * k)
    normalized_cross = normalized_D - 2 * (h / d - k / e)
    assert sp.factor(cross - d * e**2 * normalized_cross) == 0

    payment = rooted_payment(e + h, f + k, d, e, f)
    normalized_phi = PHI.subs(
        {
            X: d / e,
            D: normalized_D,
            r: h / d,
            q: k / e,
        },
        simultaneous=True,
    )
    assert sp.factor(payment - 5 * e**4 * normalized_phi) == 0


def low_rank_inputs() -> None:
    # The rank-one Q reserve is elementary for a forest with n vertices
    # and m edges.
    n, edges = sp.symbols(
        "n edges", integer=True, nonnegative=True
    )
    i2 = n * (n - 1) / 2 - edges
    q1 = sp.factor(2 * n**2 - n - 4 * i2)
    assert q1 == n + 4 * edges

    # If H has N>=10 vertices, the union bound on triples gives
    # i3(H)>=C(N,2), hence i3(H)>=i2(J) for every induced J in H.
    N, t = sp.symbols("N t", integer=True, nonnegative=True)
    triple_lower = (
        sp.binomial(N, 3) - (N - 1) * (N - 2)
    )
    margin = sp.expand_func(triple_lower - sp.binomial(N, 2))
    shifted = sp.expand(margin.subs(N, t + 10))
    assert shifted == (
        t**3 / 6 + 3 * t**2 + 83 * t / 6 + 3
    )


def star_center_case() -> None:
    leaves = sp.symbols("leaves", integer=True, nonnegative=True)

    def choose(rank):
        return sp.prod(leaves - j for j in range(rank)) / sp.factorial(rank)

    d, e, f = choose(3), choose(4), choose(5)
    payment = sp.factor(rooted_payment(e, f, d, e, f))
    expected = (
        5
        * leaves**4
        * (leaves - 3) ** 2
        * (leaves - 2) ** 4
        * (leaves - 1) ** 4
        * (leaves + 1)
        / 82_944
    )
    assert sp.factor(payment - expected) == 0


def main() -> int:
    symbolic_identity()
    verify_payment_normalization()
    structural_normalization()
    low_rank_inputs()
    star_center_case()
    print("rank-5 terminal-payment symbolic assembly: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
