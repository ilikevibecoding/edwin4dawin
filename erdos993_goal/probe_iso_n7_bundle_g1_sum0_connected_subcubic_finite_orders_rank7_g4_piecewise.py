#!/usr/bin/env python3
"""Scan fixed-order Bernstein controls below the subcubic tail cutoff."""

from __future__ import annotations

import sympy as sp

from prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein import (
    certify_bernstein,
)
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import (
    fast_tensor_bernstein,
)
from probe_iso_n7_bundle_g1_sum0_subcubic_support_relaxation_rank7_g4_piecewise import (
    choose,
)


def main() -> None:
    m = sp.symbols("m", nonnegative=True)
    x, y, z = sp.symbols("x y z", nonnegative=True)
    branches = {
        "low": ((m-1)*x/3, lambda branch: m+branch-5),
        "high": (
            (m-1)/3+(m-4)*x/6,
            lambda branch: 4*branch-4,
        ),
    }
    values = {}
    for label, (branch, p4_floor) in branches.items():
        omega = m+branch-2
        p4_minimum = p4_floor(branch)
        p4_maximum = m+3*branch-3 if label == "low" else 2*m-8
        p4 = p4_minimum+(p4_maximum-p4_minimum)*y
        j4 = choose(m-1, 2)-omega-p4
        wedge_floor = omega*(m-3)-9*branch-6*p4
        e5_lower = wedge_floor
        e5_magnitude = e5_lower+(j4*(m-4)-e5_lower)*z
        d = {
            0: sp.Integer(1), 1: sp.Integer(0), 2: 1-m,
            3: omega,
            4: j4-branch,
            5: -e5_magnitude,
            # Every positive six-vertex support has at least three vertex
            # deletions which are negative five-vertex supports.  Such a
            # five-support is P5 or P3+K2, so in a subcubic forest it has at
            # most 7 or 9 boundary edges.  Hence 3 E6^+ <= 9(-E5).
            6: 3*e5_magnitude,
            7: (
                omega*choose(m-3, 2)
                -(m-6)*(3*branch+2*p4)
                +2*p4*(m-5)+80*branch
            ),
            8: (
                choose(m-1, 4)-omega*choose(m-3, 2)/6
                +choose(branch, 2)+40*branch+8*omega+p4
            ),
        }
        w = {
            rank: sp.expand(sum(d[v]*choose(m-v, rank-v) for v in range(rank+1)))
            for rank in range(3, 9)
        }
        w3, w4, w5, w6, w7, w8 = (w[rank] for rank in range(3, 9))
        values[label] = sp.expand(
            8*w3*w3 + 24*w3*w4 - 64*w3*w5 - 106*w3*w6
            - 51*w3*w7 - 8*w3*w8 + 80*w4*w4 + 90*w4*w5
            - 12*w4*w6 - 10*w4*w7 + 39*w5*w5 + 10*w5*w6
        )
    tail = sp.symbols("tail", nonnegative=True)
    for label, value in values.items():
        try:
            certificate = certify_bernstein(
                sp.expand(value.subs(m, tail+24)), (x, y, z), tail=tail
            )
            print("GLOBAL_TAIL", label, certificate)
        except AssertionError as error:
            print("GLOBAL_TAIL_FAIL", label, error)
    passing = []
    failing = []
    for order in range(11, 320):
        local = []
        for label, value in values.items():
            degrees, controls = fast_tensor_bernstein(value.subs(m, order), (x, y, z))
            minimum_index, minimum = min(controls.items(), key=lambda item: item[1])
            local.append((minimum, label, minimum_index))
        minimum, label, minimum_index = min(local)
        (passing if minimum >= 0 else failing).append(
            (order, minimum, label, minimum_index)
        )
    print("DEGREES", degrees)
    print("PASS_RANGE", passing[0] if passing else None, passing[-1] if passing else None,
          "COUNT", len(passing))
    print("FAIL_RANGE", failing[0] if failing else None, failing[-1] if failing else None,
          "COUNT", len(failing))
    print("NONMONOTONE", [row for row in failing if row[0] > passing[0][0]][:20] if passing else [])


if __name__ == "__main__":
    main()
