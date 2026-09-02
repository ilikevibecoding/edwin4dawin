#!/usr/bin/env python3
"""Refine the distance-six tail charts on their actual parameter cones."""

from time import perf_counter

from sympy.polys.domains import QQ
from sympy.polys.fields import field

from probe_terminal_q3_m0_marked_isolate_hub_distance6_double_broom_sparse_root import (
    DISTANCE,
    core_terms,
    falling,
    normalized_delta,
    stats,
)


def inactive_cones():
    # q>=y: q=t+u+v, y=t+u, a=q+t+1.
    _, t, u, v = field("t,u,v", QQ)
    q = t + u + v
    y = t + u
    b = q + 1
    target = q + y + 4
    a = q + t + 1
    f_terms, z_terms = core_terms(DISTANCE, a, b)
    start = perf_counter()
    expression = normalized_delta(f_terms, z_terms, a, b, target, 0, 0)
    stats("tail_inactive_q_ge_y", expression, perf_counter() - start)

    # y>=q: q=t+u, y=t+u+v, a=y+t+1.
    _, t, u, v = field("t,u,v", QQ)
    q = t + u
    y = t + u + v
    b = q + 1
    target = q + y + 4
    a = y + t + 1
    f_terms, z_terms = core_terms(DISTANCE, a, b)
    start = perf_counter()
    expression = normalized_delta(f_terms, z_terms, a, b, target, 0, 0)
    stats("tail_inactive_y_ge_q", expression, perf_counter() - start)


def active_cone():
    _, q, s, y = field("q,s,y", QQ)
    b = q + 1
    target = q + y + 4
    a = q + y + s + 2
    n = a + b
    selected = target - 4
    u_a2 = falling(a, 2) / falling(n, 2)
    A = a - 2
    first_cap = u_a2 * A / (A + selected * b)
    second_cap = u_a2 * A**2 / (
        A**2 + selected * A * b + selected * (selected - 1) * b**2 / 2
    )
    f_terms, z_terms = core_terms(DISTANCE, a, b)
    for label, rho in (
        ("tail_active_origin", 0),
        ("tail_active_first_cap", first_cap),
        ("tail_active_second_cap", second_cap),
    ):
        start = perf_counter()
        expression = normalized_delta(f_terms, z_terms, a, b, target, rho, 0)
        stats(label, expression, perf_counter() - start)


def main():
    inactive_cones()
    active_cone()


if __name__ == "__main__":
    main()
