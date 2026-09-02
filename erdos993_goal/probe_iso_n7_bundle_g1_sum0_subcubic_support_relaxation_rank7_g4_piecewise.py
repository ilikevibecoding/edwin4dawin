#!/usr/bin/env python3
"""Exact support-basis relaxation for connected subcubic no-parent G1."""

from __future__ import annotations

import sympy as sp

from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


def choose(value, rank):
    if rank < 0:
        return sp.Integer(0)
    if rank == 0:
        return sp.Integer(1)
    return sp.prod(value-offset for offset in range(rank))/sp.factorial(rank)


def main() -> None:
    m, tail = sp.symbols("m tail", nonnegative=True)
    branch_fraction, p4_fraction, e5_fraction = sp.symbols(
        "branch_fraction p4_fraction e5_fraction", nonnegative=True
    )
    branch = (m-2)*branch_fraction/2
    omega = m+branch-2
    p4 = 2*omega*p4_fraction
    j4 = choose(m-1, 2)-omega-p4
    d = {
        0: sp.Integer(1), 1: sp.Integer(0), 2: 1-m,
        3: omega,
        4: j4-branch,
        5: -j4*(m-4)*e5_fraction,
        6: j4*choose(m-4, 2),
        7: j4*choose(m-4, 3),
        8: j4*choose(m-4, 4),
    }
    rows = {
        rank: sp.expand(sum(
            d[v]*choose(m-v, rank-v) for v in range(rank+1)
        ))
        for rank in range(3, 9)
    }
    w3, w4, w5, w6, w7, w8 = (rows[rank] for rank in range(3, 9))
    value = sp.expand(
        8*w3*w3 + 24*w3*w4 - 64*w3*w5 - 106*w3*w6
        - 51*w3*w7 - 8*w3*w8 + 80*w4*w4 + 90*w4*w5
        - 12*w4*w6 - 10*w4*w7 + 39*w5*w5 + 10*w5*w6
    )
    for threshold in range(311, 321):
        shifted = sp.expand(value.subs(m, tail+threshold))
        summary = fast_summary(
            shifted, (branch_fraction, p4_fraction, e5_fraction), tail
        )
        print(threshold, summary["negative_tail_scalar_coefficients"],
              summary["minimum_tail_scalar_coefficient"],
              summary["ordered_stream_sha256"])


if __name__ == "__main__":
    main()
