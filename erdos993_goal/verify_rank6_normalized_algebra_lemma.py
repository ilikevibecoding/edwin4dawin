#!/usr/bin/env python3
"""Exact normalized algebra lemma for the rank-6 leaf payment.

Let

    0 <= X <= 2,
    (2+X)/12 <= D <= 1,
    1/2 <= r <= 1,
    r-D/2 <= q <= 1.

Then PHI6(X,D,r,q) >= 0.  The proof is an exact concavity reduction
to six factored univariate endpoint polynomials.
"""

from __future__ import annotations

import sympy as sp

from explore_rank6_normalized_algebra import D, PHI, X, q, r
from verify_general_q_leaf_payment_identity import payment


D0 = (2 + X) / 12


def verify_payment_normalization() -> None:
    d, e, f, h, k = sp.symbols("d e f h k", positive=True)
    rooted_payment = payment(6, e + h, f + k, d, e, f)
    normalized = PHI.subs(
        {
            X: d / e,
            D: 1 - d * f / e**2,
            r: h / d,
            q: k / e,
        },
        simultaneous=True,
    )
    assert sp.factor(rooted_payment - 6 * e**4 * normalized) == 0


def verify_calculus_reduction() -> None:
    assert sp.diff(PHI, q, 2) == -24 * X**2
    lower = sp.expand(PHI.subs(q, r - D / 2))
    upper = sp.expand(PHI.subs(q, 1))

    # The lower q endpoint is concave in D.  It increases in r
    # throughout the domain because 14D-X-2 >= (X+2)/6 >= 0.
    assert sp.factor(sp.diff(lower, D, 2)) == -6 * (X + 2) ** 2
    assert sp.factor(sp.diff(lower, r)) == (
        X * (14 * D - X - 2) * (2 * X * r + X + 2)
    )
    assert sp.factor(
        (14 * D0 - X - 2) - (X + 2) / 6
    ) == 0

    # The upper q endpoint is concave in D.  At either D endpoint
    # it is also concave in r, so only the four corners remain.
    assert sp.diff(upper, D, 2) == -24
    assert sp.factor(sp.diff(upper, r, 2)) == (
        2 * X**2 * (14 * D - X - 14)
    )


def endpoint_factors() -> dict[str, sp.Expr]:
    lower = sp.expand(PHI.subs(q, r - D / 2))
    endpoints = {
        "lower_D0": sp.factor(
            lower.subs({D: D0, r: sp.Rational(1, 2)})
        ),
        "lower_D1": sp.factor(
            lower.subs({D: 1, r: sp.Rational(1, 2)})
        ),
        "upper_D0_rhalf": sp.factor(
            PHI.subs({D: D0, q: 1, r: sp.Rational(1, 2)})
        ),
        "upper_D0_r1": sp.factor(
            PHI.subs({D: D0, q: 1, r: 1})
        ),
        "upper_D1_rhalf": sp.factor(
            PHI.subs({D: 1, q: 1, r: sp.Rational(1, 2)})
        ),
        "upper_D1_r1": sp.factor(
            PHI.subs({D: 1, q: 1, r: 1})
        ),
    }
    assert endpoints == {
        "lower_D0": -X * (X - 2) * (X + 2) ** 2 / 48,
        "lower_D1": -X * (X + 2) * (3 * X - 22) / 4,
        "upper_D0_rhalf": X * (X - 10) * (X - 2) / 8,
        "upper_D0_r1": X * (X + 2) * (4 * X + 5) / 12,
        "upper_D1_rhalf": -X * (X - 10) * (3 * X + 14) / 4,
        "upper_D1_r1": -X * (2 * X**2 - 21 * X - 35),
    }
    return endpoints


def main() -> int:
    verify_payment_normalization()
    verify_calculus_reduction()
    endpoints = endpoint_factors()
    print("rank-6 normalized algebra lemma: CERTIFIED")
    for name, factor in endpoints.items():
        print(name, factor)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
