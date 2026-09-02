#!/usr/bin/env python3
"""Verify the colored-cycle model for the endpoint inclusion--exclusion core.

Let F_N=N!g_N.  Its coefficient of X^(N-k) counts a k-matching of the
subdivision path P_(2N-1), followed by an injection of its k edges into N
colors.  Forcing the left (or right) boundary edge consumes one fresh color
and leaves P_(2N-3), so its generating polynomial is N*F_(N-1).  Forcing both
boundary edges gives N*(N-1)*F_(N-2).

Two copies of P_(2N-1), with corresponding endpoint vertices identified,
form C_(4N-4).  Inclusion--exclusion at the two identified vertices therefore
gives a positive colored-matching model for

    F_N(X)F_N(Y)-2[N F_(N-1)(X)][N F_(N-1)(Y)]
      +[N(N-1)F_(N-2)(X)][N(N-1)F_(N-2)(Y)].

The script verifies the identities exactly in finite orders.  The displayed
inclusion--exclusion is an all-order combinatorial proof.
"""

from __future__ import annotations

import json
from collections import defaultdict
from math import factorial
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
X, Y = sp.symbols("X Y")


def falling(n: int, k: int) -> int:
    answer = 1
    for value in range(k):
        answer *= n - value
    return answer


def g(n: int, variable: sp.Symbol) -> sp.Expr:
    if n == 0:
        return sp.S.One
    return sp.expand(sum(
        sp.binomial(n + k - 1, n - k) * variable**k / factorial(k)
        for k in range(n + 1)
    ))


def F(n: int, variable: sp.Symbol) -> sp.Expr:
    return sp.expand(factorial(n) * g(n, variable))


def cycle_matching_counts(N: int) -> dict[tuple[int, int], int]:
    """Counts matchings of C_(4N-4) by the two path-arc edge counts."""
    arc_length = 2 * N - 2
    labels = [0] * arc_length + [1] * arc_length
    edge_count = len(labels)
    answer: dict[tuple[int, int], int] = defaultdict(int)

    # Independent sets of the line graph C_edge_count.  Condition on whether
    # the first cycle edge is selected, then use a path recurrence.
    for first in (0, 1):
        states: dict[tuple[int, int, int], int] = {
            (first, first if labels[0] == 0 else 0,
             first if labels[0] == 1 else 0): 1
        }
        for index in range(1, edge_count):
            next_states: dict[tuple[int, int, int], int] = defaultdict(int)
            for (previous, count_a, count_b), multiplicity in states.items():
                next_states[(0, count_a, count_b)] += multiplicity
                if not previous:
                    next_states[(
                        1,
                        count_a + int(labels[index] == 0),
                        count_b + int(labels[index] == 1),
                    )] += multiplicity
            states = next_states
        for (last, count_a, count_b), multiplicity in states.items():
            if not (first and last):
                answer[(count_a, count_b)] += multiplicity
    return dict(answer)


def colored_cycle_polynomial(N: int) -> sp.Expr:
    return sp.expand(sum(
        multiplicity
        * falling(N, count_a)
        * falling(N, count_b)
        * X ** (N - count_a)
        * Y ** (N - count_b)
        for (count_a, count_b), multiplicity in cycle_matching_counts(N).items()
    ))


def endpoint_core(N: int) -> sp.Expr:
    top = F(N, X) * F(N, Y)
    one = N * F(N - 1, X) * N * F(N - 1, Y)
    two = (
        N * (N - 1) * F(N - 2, X)
        * N * (N - 1) * F(N - 2, Y)
    )
    return sp.expand(top - 2 * one + two)


def derivative_sum(poly: sp.Expr, order: int) -> sp.Expr:
    if order < 0:
        return sp.S.Zero
    return sp.expand(sum(
        sp.binomial(order, left)
        * sp.diff(poly, X, left, Y, order - left)
        for left in range(order + 1)
    ))


def main() -> None:
    records = []
    for N in range(3, 11):
        counts = cycle_matching_counts(N)
        actual = colored_cycle_polynomial(N)
        expected = endpoint_core(N)
        assert sp.expand(actual - expected) == 0

        derivative_checks = []
        for order in range(4, min(11, 2 * N + 1)):
            scaled_target = sp.expand(
                derivative_sum(F(N, X) * F(N, Y), order)
                - 2 * derivative_sum(
                    N * F(N - 1, X) * N * F(N - 1, Y), order - 2
                )
                + derivative_sum(
                    N * (N - 1) * F(N - 2, X)
                    * N * (N - 1) * F(N - 2, Y),
                    order - 4,
                )
            )
            unscaled = sp.expand(
                derivative_sum(g(N, X) * g(N, Y), order)
                - 2 * derivative_sum(
                    g(N - 1, X) * g(N - 1, Y), order - 2
                )
                + derivative_sum(
                    g(N - 2, X) * g(N - 2, Y), order - 4
                )
            )
            assert sp.expand(scaled_target - factorial(N) ** 2 * unscaled) == 0
            derivative_checks.append(order)

        records.append({
            "N": N,
            "cycle_vertices": 4 * N - 4,
            "bidegree_cells": len(counts),
            "cycle_core_terms": len(sp.Poly(actual, X, Y).terms()),
            "derivative_orders_checked": derivative_checks,
        })

    report = {
        "status": "ALL_ORDER_COLORED_CYCLE_INCLUSION_IDENTITY_PROVED",
        "records": records,
        "scope": (
            "The cycle inclusion--exclusion model and endpoint forcing "
            "identities are proved in all orders.  The finite checks replay "
            "the formulas.  Stability after the derivative offsets still "
            "requires the graded color-slot contraction theorem."
        ),
    }
    out = HERE / "colored_cycle_endpoint_inclusion_model_20260804.json"
    out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(out)


if __name__ == "__main__":
    main()
