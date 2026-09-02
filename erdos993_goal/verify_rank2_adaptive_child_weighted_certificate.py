#!/usr/bin/env python3
"""Symbolically verify the rank-2 ACWF certificate."""

from __future__ import annotations

import sympy as sp


def main() -> int:
    n, q, S, s = sp.symbols("n q S s", integer=True, nonnegative=True)
    e = n - q
    u2 = sp.expand_func(sp.binomial(n, 2) - e)
    u3 = sp.expand_func(sp.binomial(n, 3) - e * (n - 2) + S)
    j2 = sp.expand_func(sp.binomial(e, 2) - e + s)

    minor_u = sp.expand(4 * u2**2 - 6 * n * u3)
    interaction = sp.expand(8 * u2 * e - 6 * u3 - 6 * n * j2)

    expected_minor = (
        -6 * n * S
        + 3 * n**3
        - 2 * n**2 * q
        - 5 * n**2
        + 4 * q**2
    )
    expected_interaction = (
        -6 * S
        + 2 * n**2 * q
        + 6 * n**2
        - 3 * n * q**2
        + 5 * n * q
        - 6 * n * s
        - 14 * n
        - 8 * q**2
        + 12 * q
    )
    assert sp.expand(minor_u - expected_minor) == 0
    assert sp.expand(interaction - expected_interaction) == 0

    # q=1: substitute the sharp universal forest bounds
    # S <= C(n-1,2), s <= n-1.
    gap1 = sp.expand(minor_u + interaction).subs(q, 1)
    lower1 = sp.factor(
        gap1.subs(
            {
                S: (n - 1) * (n - 2) / 2,
                s: n - 1,
            }
        )
    )
    assert sp.expand(lower1 - (n - 1) * (n - 2)) == 0

    # q=2: the ACWF weight of M_U is zero.
    gap2 = sp.expand(2 * interaction).subs(q, 2)
    lower2 = sp.factor(
        gap2.subs(
            {
                S: (n - 2) * (n - 3) / 2,
                s: n - 2,
            }
        )
    )
    assert sp.expand(lower2 - 2 * (n - 2) * (n + 13)) == 0

    # q>=3: substitute S <= C(e,2), s <= e.
    gap_ge3 = sp.expand((q - 2) * minor_u + q * interaction)
    lower_ge3 = sp.factor(
        gap_ge3.subs(
            {
                S: e * (e - 1) / 2,
                s: e,
            }
        )
    )
    claimed_ge3 = (n - q) * (
        6 * n * q**2
        - 13 * n * q
        + 4 * n
        + 7 * q**2
        - q
    )
    assert sp.expand(lower_ge3 - claimed_ge3) == 0

    coefficient = 6 * q**2 - 13 * q + 4
    second_factor = (
        6 * n * q**2
        - 13 * n * q
        + 4 * n
        + 7 * q**2
        - q
    )
    at_n_equals_q = sp.factor(second_factor.subs(n, q))
    assert sp.expand(at_n_equals_q - 3 * q * (2 * q**2 - 2 * q + 1)) == 0
    assert coefficient.subs(q, 3) == 19
    assert sp.factor(coefficient.subs(q, q + 1) - coefficient) == 12 * q - 7

    # Stronger unary mixed reserve H=M_A+2 X(A,sigma(U)).
    a1 = n + 1
    a2 = sp.expand(u2 + e)
    a3 = sp.expand(u3 + j2)
    minor_a_rank2 = sp.expand(4 * a2**2 - 6 * a1 * a3)
    mixed_a_sigma_u_rank2 = sp.expand(
        8 * n * a2 - 6 * a3 - 6 * u2 * a1
    )
    unary_reserve_rank2 = sp.factor(
        minor_a_rank2 + 2 * mixed_a_sigma_u_rank2
    )
    expected_unary_rank2 = 3 * (
        n**3
        + 6 * n**2
        + n
        - n * q**2
        - 3 * n * q
        - 3 * q**2
        - q
        - 2 * (n + 3) * (S + s)
    )
    assert sp.expand(unary_reserve_rank2 - expected_unary_rank2) == 0

    unary_lower = sp.factor(
        unary_reserve_rank2.subs(
            {
                S: e * (e - 1) / 2,
                s: e,
            }
        )
    )
    claimed_unary_lower = 6 * (n - q) * (n * q + n + 3 * q - 1)
    assert sp.expand(unary_lower - claimed_unary_lower) == 0

    print("rank-2 ACWF symbolic certificate: PASS")
    print("q=1 lower bound:", lower1)
    print("q=2 lower bound:", lower2)
    print("q>=3 lower bound:", lower_ge3)
    print("unary mixed-reserve lower bound:", unary_lower)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
