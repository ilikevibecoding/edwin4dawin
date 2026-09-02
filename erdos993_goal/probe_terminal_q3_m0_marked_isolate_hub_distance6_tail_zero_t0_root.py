#!/usr/bin/env python3
"""Boundary charts for support slack t=0 in the zero-side distance-six tail."""

from time import perf_counter

from sympy.polys.domains import QQ
from sympy.polys.fields import field

from probe_terminal_q3_m0_marked_isolate_hub_distance6_double_broom_sparse_root import (
    DISTANCE,
    anchor,
    core_terms,
    normalized_coefficient,
    stats,
)


def zero_side_delta(a, b, target):
    f_terms, z_terms = core_terms(DISTANCE, a, b)
    f_n = [term for term in f_terms if term[0] == "n"]
    z_n = [term for term in z_terms if term[0] == "n"]
    f2, p0, r0, c0, determinant = anchor(f_terms, z_terms, a, b)
    fm1 = normalized_coefficient(f_n, target - 1, a, b, 0, 0)
    f0 = normalized_coefficient(f_n, target, a, b, 0, 0)
    fp1 = normalized_coefficient(f_n, target + 1, a, b, 0, 0)
    zp1 = normalized_coefficient(z_n, target + 1, a, b, 0, 0)
    return (
        (target + 1) * f2 * determinant * (fp1 + 2 * f0 + fm1)
        + f2
        * p0
        * (
            (target + 1) * f0 * (c0 + r0)
            - 3 * (p0 + f2) * (zp1 + 2 * f0)
        )
    )


def main():
    # t=0, s>=1: b=s+1, a=s+r+1, j=r+2s+4.
    _, r, u = field("r,u", QQ)
    s = u + 1
    b = s + 1
    a = s + r + 1
    target = r + 2 * s + 4
    start = perf_counter()
    stats(
        "tail_zero_t0_sge1",
        zero_side_delta(a, b, target),
        perf_counter() - start,
    )

    # t=0, s=0, r>=2: b=1, a=r+1, j=r+4.
    _, u = field("u", QQ)
    r = u + 2
    b = 1
    a = r + 1
    target = r + 4
    start = perf_counter()
    stats(
        "tail_zero_t0_s0_rge2",
        zero_side_delta(a, b, target),
        perf_counter() - start,
    )


if __name__ == "__main__":
    main()
