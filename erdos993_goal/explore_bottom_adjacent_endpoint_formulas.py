#!/usr/bin/env python3
"""Inspect adjacent compressed-row differences at t=0 and t=1."""

import sympy as sp

from verify_bottom_barycentric_sturm_reduction import super_ballot
from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


for d in range(3, 19):
    q = d - 1
    Tau = super_ballot(q)
    H = sp.simplify(
        Tau * (central_inverse_from_blocks(d).inv() * reverse_identity(q)) * Tau.T
    )
    print(f"d={d}")
    for a in range(1, q):
        at_zero = sp.factor(H[a, 0] - H[a - 1, 0])
        at_one = sp.factor(sum(H[a, b] - H[a - 1, b] for b in range(q)))
        print(
            f" a={a} r={d-a} boundary={d-3*a-2}: "
            f"D0={at_zero}, D1={at_one}"
        )
