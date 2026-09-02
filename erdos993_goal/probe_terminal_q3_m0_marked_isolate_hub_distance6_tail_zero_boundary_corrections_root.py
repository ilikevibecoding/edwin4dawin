#!/usr/bin/env python3
"""Boundary corrections when a zero-side tail has gap j-side equal to 3 or 4."""

from time import perf_counter

from sympy.polys.domains import QQ
from sympy.polys.fields import field

from probe_terminal_q3_m0_marked_isolate_hub_distance6_double_broom_sparse_root import (
    stats,
)
from prove_terminal_q3_m0_marked_isolate_hub_distance6_double_broom_middle_all_j_root import (
    anchor,
)


def gap3_correction(side, other, target):
    f2, p0, r0, c0, determinant = anchor(side, other)
    common = f2 * determinant
    return (
        (target + 1) * common * (3 * side + 10)
        + f2
        * p0
        * (
            3 * (target + 1) * (c0 + r0)
            - 9 * (p0 + f2) * (other + 3)
        )
    )


def main():
    # Large side a has gap j-a=3: a=t+r+1, b=t+1, j=a+3.
    _, t, r = field("t,r", QQ)
    b = t + 1
    a = t + r + 1
    target = a + 3
    start = perf_counter()
    expression = gap3_correction(a, b, target)
    stats("tail_zero_gap3_large_side_correction", expression, perf_counter() - start)

    # Active tail start has small-side gap j-b=3 with
    # b=q+1, j=q+4, a=q+u+2.
    _, q, u = field("q,u", QQ)
    b = q + 1
    a = q + u + 2
    target = q + 4
    start = perf_counter()
    expression = gap3_correction(b, a, target)
    stats("tail_active_gap3_small_side_correction", expression, perf_counter() - start)


if __name__ == "__main__":
    main()
