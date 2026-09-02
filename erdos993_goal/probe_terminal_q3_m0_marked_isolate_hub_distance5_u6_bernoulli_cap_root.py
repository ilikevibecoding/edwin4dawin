#!/usr/bin/env python3
"""Test a depth-sensitive hypergeometric cap for the distance-five charts.

After six fixed selected vertices,

  C(A,k)/C(A+B,k) <= (A/(A+B))^k <= A/(A+kB).

The final inequality is Bernoulli's inequality.  It yields a rational
finite-degree endpoint that is exact for k=1 and decays with target depth.
"""

from time import perf_counter

from sympy.polys.domains import QQ
from sympy.polys.fields import field

from probe_terminal_q3_m0_marked_isolate_hub_distance5_u6_sparse_ring_root import (
    delta_for,
    endpoint_stats,
    falling,
)


def run_middle():
    _, q, v, y = field("q,v,y", QQ)
    a = q + v + y + 7
    b = q + y + 7
    j = y + 9
    n = a + b
    k = y + 1
    ua6 = falling(a, 6) / falling(n, 6)
    ub6 = falling(b, 6) / falling(n, 6)
    cap_a = ua6 * (a - 6) / ((a - 6) + k * b)
    cap_b = ub6 * (b - 6) / ((b - 6) + k * a)
    for label, rho, tau in (
        ("middle_depthcap_origin", 0, 0),
        ("middle_depthcap_large", cap_a, 0),
        ("middle_depthcap_small", 0, cap_b),
        ("middle_depthcap_both", cap_a, cap_b),
    ):
        start = perf_counter()
        expression = delta_for(a, b, j, rho, tau)
        endpoint_stats(label, expression, perf_counter() - start)


def run_all_middle_u2():
    _, q, v, y = field("q,v,y", QQ)
    j = y + 5
    b = q + y + 3
    a = q + v + y + 3
    n = a + b
    k = j - 4
    ua2 = falling(a, 2) / falling(n, 2)
    ub2 = falling(b, 2) / falling(n, 2)
    cap_a = ua2 * (a - 2) / ((a - 2) + k * b)
    cap_b = ub2 * (b - 2) / ((b - 2) + k * a)
    for label, rho, tau in (
        ("middle_u2_depthcap_origin", 0, 0),
        ("middle_u2_depthcap_large", cap_a, 0),
        ("middle_u2_depthcap_small", 0, cap_b),
        ("middle_u2_depthcap_both", cap_a, cap_b),
    ):
        start = perf_counter()
        expression = delta_for(a, b, j, rho, tau)
        endpoint_stats(label, expression, perf_counter() - start)


def run_j4_and_tail_lower():
    _, q, v = field("q,v", QQ)
    b = q + 2
    a = q + v + 2
    n = a + b
    u_a2 = falling(a, 2) / falling(n, 2)
    u_b2 = falling(b, 2) / falling(n, 2)
    start = perf_counter()
    expression = delta_for(a, b, 4, u_a2, u_b2)
    endpoint_stats("j4_exact_seam", expression, perf_counter() - start)

    _, q, x, y = field("q,x,y", QQ)
    b = q + 1
    j = q + y + 4
    a = x + y + 1
    start = perf_counter()
    expression = delta_for(a, b, j, 0, 0)
    endpoint_stats("tail_lower_zero", expression, perf_counter() - start)


def run_general_tail():
    _, r, s, y = field("r,s,y", QQ)
    b = r + 6
    j = r + y + 9
    a = r + y + s + 7
    n = a + b
    k = j - 8
    ua6 = falling(a, 6) / falling(n, 6)
    cap_a = ua6 * (a - 6) / ((a - 6) + k * b)
    start = perf_counter()
    expression = delta_for(a, b, j, cap_a, 0)
    endpoint_stats("tail_depthcap_bge6", expression, perf_counter() - start)


def run_all_tail_u2():
    _, q, s, y = field("q,s,y", QQ)
    b = q + 1
    j = q + y + 4
    a = q + y + s + 2
    n = a + b
    k = j - 4
    ua2 = falling(a, 2) / falling(n, 2)
    cap_a = ua2 * (a - 2) / ((a - 2) + k * b)
    start = perf_counter()
    expression = delta_for(a, b, j, cap_a, 0)
    endpoint_stats("tail_depthcap_all_b_u2", expression, perf_counter() - start)


def main():
    run_j4_and_tail_lower()
    run_middle()
    run_all_middle_u2()
    run_general_tail()
    run_all_tail_u2()


if __name__ == "__main__":
    main()
