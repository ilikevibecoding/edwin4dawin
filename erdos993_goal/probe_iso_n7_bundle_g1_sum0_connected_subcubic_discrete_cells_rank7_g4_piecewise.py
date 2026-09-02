#!/usr/bin/env python3
"""Discrete (m,b,P4) scan for the remaining subcubic support relaxation."""

from __future__ import annotations

import sympy as sp

from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_tensor_bernstein
from probe_iso_n7_bundle_g1_sum0_subcubic_support_relaxation_rank7_g4_piecewise import choose


def main() -> None:
    m, branch, p4 = sp.symbols("m branch p4", integer=True, nonnegative=True)
    z = sp.symbols("z", nonnegative=True)
    omega = m+branch-2
    j4 = choose(m-1, 2)-omega-p4
    d = {
        0: sp.Integer(1), 1: sp.Integer(0), 2: 1-m,
        3: omega,
        4: j4-branch,
        5: -j4*(sp.Rational(1, 2)+(m-sp.Rational(9, 2))*z),
        6: branch*(m-1)+choose(omega, 2)+sp.Rational(99, 2)*m,
        7: omega*choose(m-1, 2)+18*m*(m-1)+143*m,
        8: choose(m-1, 4)-omega*choose(m-3, 2)/6+choose(branch, 2)+429*m,
    }
    w = {
        rank: sp.expand(sum(d[v]*choose(m-v, rank-v) for v in range(rank+1)))
        for rank in range(3, 9)
    }
    w3, w4, w5, w6, w7, w8 = (w[rank] for rank in range(3, 9))
    value = sp.expand(
        8*w3*w3 + 24*w3*w4 - 64*w3*w5 - 106*w3*w6
        - 51*w3*w7 - 8*w3*w8 + 80*w4*w4 + 90*w4*w5
        - 12*w4*w6 - 10*w4*w7 + 39*w5*w5 + 10*w5*w6
    )
    failures = []
    passes = 0
    for order in range(11, 32):
        for cubic in range((order-2)//2+1):
            degree2 = order-2*cubic-2
            floor = degree2+3*cubic-1+max(0, cubic-degree2-1)
            ceiling = 2*(order+cubic-2)
            for path_count in range(floor, ceiling+1):
                _, controls = fast_tensor_bernstein(
                    value.subs({m: order, branch: cubic, p4: path_count}), (z,)
                )
                minimum = min(controls.values())
                if minimum < 0:
                    failures.append((order, cubic, path_count, minimum))
                else:
                    passes += 1
        print(order, passes, len(failures))
    print("FAILURES", len(failures), failures[:30], failures[-10:])


if __name__ == "__main__":
    main()
