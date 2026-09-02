#!/usr/bin/env python3
"""Derive and check the four-aggregate rank-6 spider inequalities.

For a spider, let

    a0 = number of arms of length 1,
    a1 = number of arms of length 2,
    a2 = number of arms of length at least 3,
    r  = sum(max(length - 3, 0)).

The coefficients i_4 and i_5 depend only on these four integers.
This script verifies that assertion against the direct independence
polynomial and then prints exact symbolic data for each possible root-arm
transition.
"""

from __future__ import annotations

from collections import Counter
from math import comb

import sympy as sp

from scan_rank6_spiders import partitions, spider_polynomial


def choose_int(n: int, k: int) -> int:
    return comb(n, k) if n >= k >= 0 else 0


def choose_poly(x, k: int):
    out = sp.Integer(1)
    for j in range(k):
        out *= x - j
    return sp.expand(out / sp.factorial(k))


def aggregate(arms):
    return (
        sum(length == 1 for length in arms),
        sum(length == 2 for length in arms),
        sum(length >= 3 for length in arms),
        sum(max(length - 3, 0) for length in arms),
    )


def motif_totals(a0, a1, a2, r, choose):
    """Return n, S, R, U, V for a spider from its aggregate state."""
    m = a0 + a1 + a2
    q = a1 + 2 * a2 + r
    n = 1 + m + q
    t2 = a1 + a2
    t3 = a2

    # Wedges and connected three-edge subtrees.
    wedge = choose(m, 2) + q
    connected_three = choose(m, 3) + (m - 2) * t2 + q

    # The exact P3 + K2 formula specialized to the spider degree sequence.
    degree_wedge_moment = m * choose(m, 2) + 2 * q
    neighbor_degree_moment = (
        t2 * (3 * m - 2)
        + (m - t2) * (m - 1)
        + 4 * (q - t2)
        + t2
    )
    disconnected = (
        (n + 1) * wedge
        - degree_wedge_moment
        - neighbor_degree_moment
    )

    # Connected four-edge subtrees.
    connected_four = (
        choose(m, 4)
        + choose(m - 1, 2) * t2
        + choose(t2, 2)
        + (m - 2) * t3
        + q
        - t2
    )
    return n, wedge, connected_three, disconnected, connected_four


def independent_4_5(a0, a1, a2, r, choose):
    n, wedge, connected_three, disconnected, connected_four = (
        motif_totals(a0, a1, a2, r, choose)
    )
    m = n - 1
    i4 = (
        choose(n, 4)
        - m * choose(n - 2, 2)
        + wedge * (n - 4)
        + choose(m, 2)
        - connected_three
    )
    i5 = (
        choose(n, 5)
        - m * choose(n - 2, 3)
        + wedge * choose(n - 3, 2)
        + (choose(m, 2) - wedge) * (n - 4)
        - connected_three * (n - 4)
        - disconnected
        + connected_four
    )
    return sp.expand(i4), sp.expand(i5)


def verify_aggregate_formulas(maximum_order=24):
    checked = 0
    for order in range(4, maximum_order + 1):
        for arms in partitions(order - 1):
            if len(arms) < 3:
                continue
            state = aggregate(arms)
            predicted = independent_4_5(*state, choose_int)
            direct = spider_polynomial(arms)
            actual = (
                direct[4] if len(direct) > 4 else 0,
                direct[5] if len(direct) > 5 else 0,
            )
            assert predicted == actual, (arms, state, predicted, actual)
            checked += 1
    return checked


def root_transitions(a0, a1, a2, r):
    # The labels refer to the root arm's length before deleting its leaf.
    return {
        "L1": (a0 - 1, a1, a2, r),
        "L2": (a0 + 1, a1 - 1, a2, r),
        "L3": (a0, a1 + 1, a2 - 1, r),
        "L4+": (a0, a1, a2, r - 1),
    }


def main() -> int:
    checked = verify_aggregate_formulas()
    print(
        "aggregate spider i4/i5 formulas: PASS "
        f"({checked:,} arm partitions through order 24)"
    )

    a0, a1, a2, r = sp.symbols("a0 a1 a2 r", integer=True)
    variables = (a0, a1, a2, r)
    d, e = independent_4_5(a0, a1, a2, r, choose_poly)
    transitions = root_transitions(a0, a1, a2, r)

    for label, deleted_state in transitions.items():
        h, k = independent_4_5(*deleted_state, choose_poly)
        value = sp.cancel(d * (2 * e + d) - 24 * (e * h - d * k))
        assert sp.denom(value) == 1
        polynomial = sp.Poly(sp.expand(value), *variables)
        negative = [
            (monomial, coefficient)
            for monomial, coefficient in polynomial.terms()
            if coefficient < 0
        ]
        degrees = tuple(polynomial.degree(variable) for variable in variables)
        print(
            f"{label}: total_degree={polynomial.total_degree()} "
            f"degrees={degrees} terms={len(polynomial.terms())} "
            f"negative_coefficients={len(negative)}"
        )
        print("  leading negatives:", negative[:12])

        # Verify the symbolic root transition against direct arm deletion.
        tested = 0
        maximum_direct_checks = 80
        for order in range(4, 22):
            if tested >= maximum_direct_checks:
                break
            for arms in partitions(order - 1):
                if tested >= maximum_direct_checks:
                    break
                if len(arms) < 3:
                    continue
                possible_lengths = {
                    "L1": [1],
                    "L2": [2],
                    "L3": [3],
                    "L4+": [length for length in set(arms) if length >= 4],
                }[label]
                for root_length in possible_lengths:
                    if tested >= maximum_direct_checks:
                        break
                    if root_length not in arms:
                        continue
                    shortened = list(arms)
                    shortened.remove(root_length)
                    if root_length > 1:
                        shortened.append(root_length - 1)
                    shortened.sort()
                    whole = spider_polynomial(arms)
                    deleted = spider_polynomial(tuple(shortened))
                    dd = whole[4] if len(whole) > 4 else 0
                    ee = whole[5] if len(whole) > 5 else 0
                    hh = deleted[4] if len(deleted) > 4 else 0
                    kk = deleted[5] if len(deleted) > 5 else 0
                    actual = dd * (2 * ee + dd) - 24 * (ee * hh - dd * kk)
                    subs = dict(zip(variables, aggregate(arms)))
                    predicted = int(polynomial.as_expr().subs(subs))
                    assert predicted == actual, (
                        label,
                        arms,
                        root_length,
                        predicted,
                        actual,
                    )
                    tested += 1
        print(f"  direct rooted checks: PASS ({tested:,})")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
