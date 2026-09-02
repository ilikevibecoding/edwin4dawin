#!/usr/bin/env python3
"""Exact low-target and terminal-endpoint charts for the distance-six tail."""

from time import perf_counter

from sympy.polys.domains import QQ
from sympy.polys.fields import field

from probe_terminal_q3_m0_marked_isolate_hub_distance6_double_broom_sparse_root import (
    stats,
)
from prove_terminal_q3_m0_marked_isolate_hub_distance6_double_broom_middle_all_j_root import (
    anchor,
    fixed_delta,
)


def endpoint_delta(a, b, fprev):
    n = a + b
    target = n + 3
    f2, p0, r0, c0, determinant = anchor(a, b)
    return (
        (target + 1) * f2 * determinant * (fprev + 2)
        + f2
        * p0
        * (
            (target + 1) * (c0 + r0)
            - 6 * (p0 + f2)
        )
    )


def show(label, expression):
    start = perf_counter()
    stats(label, expression, perf_counter() - start)


def main():
    _, u = field("u", QQ)
    show("tail_j4_b1", fixed_delta(u + 1, 1, 4))
    show("tail_j5_b1", fixed_delta(u + 1, 1, 5))
    show("tail_j5_b2", fixed_delta(u + 2, 2, 5))

    # Endpoint j=n+3.  F_(n+3)=1, F_(n+4)=Z_(n+4)=0.
    _, q, u = field("q,u", QQ)
    b = q + 2
    a = b + u
    n = a + b
    show("tail_endpoint_bge2", endpoint_delta(a, b, n + 6))

    _, u = field("u", QQ)
    b = 1
    a = u + 2
    n = a + b
    show("tail_endpoint_b1_age2", endpoint_delta(a, b, n + 9))

    _, u = field("u", QQ)
    # A zero-variable field is inconvenient; retain a dummy and evaluate at 0.
    a = u + 1
    b = u + 1
    expression = endpoint_delta(a, b, a + b + 12)
    show("tail_endpoint_a1_b1_containing_diagonal", expression)


if __name__ == "__main__":
    main()
