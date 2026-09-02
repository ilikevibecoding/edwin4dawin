#!/usr/bin/env python3
"""Look for low-rank recurrences between consecutive compressed forms H_d."""

import sympy as sp

from verify_bottom_barycentric_sturm_reduction import super_ballot
from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


def compressed(d: int) -> sp.Matrix:
    q = d - 1
    Tau = super_ballot(q)
    return sp.simplify(
        Tau * (central_inverse_from_blocks(d).inv() * reverse_identity(q)) * Tau.T
    )


previous = compressed(3)
for d in range(3, 18):
    old = previous
    new = compressed(d + 1)
    q = d - 1
    block = new[:q, :q]
    scalar = sp.factor(block[q - 1, 0] / old[q - 1, 0])
    difference = sp.simplify(block - scalar * old)
    print(
        f"d={d}->d+1 scalar={scalar}, rank(diff)={difference.rank()}, "
        f"det-ratio={sp.factor(block.det()/old.det())}"
    )
    previous = new
