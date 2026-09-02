#!/usr/bin/env python3
"""Coarse all-order moment cone for connected high-degree G1."""

from __future__ import annotations

import sympy as sp

from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary
from prove_iso_n7_bundle_g1_sum0_connected_subcubic_no_parent_universal_rank7_g4_piecewise import choose


def main() -> None:
    m, tail = sp.symbols("m tail", nonnegative=True)
    variables = sp.symbols("s u3 u4 u5 u6 u7 z", nonnegative=True)
    s, u3, u4, u5, u6, u7, z = variables
    s2_minimum = m+3
    s2_maximum = choose(m-5, 2)+6
    s2 = s2_minimum+(s2_maximum-s2_minimum)*s
    fractions = {3: u3, 4: u4, 5: u5, 6: u6, 7: u7}
    moments = {2: s2}
    for rank in range(3, 8):
        cap = s2*choose(m-3, rank-2)/choose(rank, 2)
        moments[rank] = cap*fractions[rank]
    j4 = choose(m-1, 2)-s2-(m-3)
    magnitude = j4*(m-4)*z
    d = {
        0: sp.Integer(1), 1: sp.Integer(0), 2: 1-m,
        3: moments[2], 4: j4-moments[3],
        5: moments[4]-magnitude,
        6: -moments[5]+(m-5)*magnitude/3,
        7: moments[6]+j4*choose(m-4, 3),
        8: -moments[7]+j4*choose(m-4, 4),
    }
    rows = {
        rank: sp.expand(sum(d[v]*choose(m-v, rank-v) for v in range(rank+1)))
        for rank in range(3, 9)
    }
    w3, w4, w5, w6, w7, w8 = (rows[rank] for rank in range(3, 9))
    value = sp.expand(
        8*w3*w3+24*w3*w4-64*w3*w5-106*w3*w6-51*w3*w7
        -8*w3*w8+80*w4*w4+90*w4*w5-12*w4*w6-10*w4*w7
        +39*w5*w5+10*w5*w6
    )
    for threshold in (42, 100, 320, 1000):
        summary = fast_summary(
            sp.expand(value.subs(m, tail+threshold)), variables, tail
        )
        print(threshold, summary["negative_tail_scalar_coefficients"],
              summary["minimum_tail_scalar_coefficient"],
              summary["first_negative"][:1])


if __name__ == "__main__":
    main()
