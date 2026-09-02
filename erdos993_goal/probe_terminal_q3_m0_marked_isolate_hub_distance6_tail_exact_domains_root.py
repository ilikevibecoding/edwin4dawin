#!/usr/bin/env python3
"""Exact-domain tail charts for distance-six double brooms."""

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


def main():
    # rho=tau=0.  Exact constraints a>=b and a<j-2 are encoded by
    # b=q+1, a=q+r+1, j=q+r+s+4.
    # Support C(n,j-2)>0 additionally forces q>=s; write q=s+t.
    _, t, r, s = field("t,r,s", QQ)
    b = s + t + 1
    a = s + t + r + 1
    target = t + r + 2 * s + 4
    f_terms, z_terms = core_terms(DISTANCE, a, b)
    start = perf_counter()
    expression = normalized_delta(f_terms, z_terms, a, b, target, 0, 0)
    stats("tail_zero_exact_domain", expression, perf_counter() - start)

    # Active large side: a=j-2+u.  Test the exact zero endpoint and the
    # depth-sensitive cap for rho=C(a,j-2)/C(a+b,j-2).
    _, q, u, y = field("q,u,y", QQ)
    b = q + 1
    target = q + y + 4
    a = q + y + u + 2
    n = a + b
    selected = target - 4
    u_a2 = falling(a, 2) / falling(n, 2)
    cap_a = u_a2 * (a - 2) / ((a - 2) + selected * b)
    f_terms, z_terms = core_terms(DISTANCE, a, b)
    for label, rho in (
        ("tail_active_origin_exact_domain", 0),
        ("tail_active_depth_cap_exact_domain", cap_a),
    ):
        start = perf_counter()
        expression = normalized_delta(
            f_terms, z_terms, a, b, target, rho, 0
        )
        stats(label, expression, perf_counter() - start)


if __name__ == "__main__":
    main()
