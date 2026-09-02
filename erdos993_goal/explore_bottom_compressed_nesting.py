#!/usr/bin/env python3
"""Test diagonal equivalence and low-rank recurrences of compressed H_d."""

import sympy as sp

from verify_bottom_barycentric_sturm_reduction import super_ballot
from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


def compressed(d: int) -> sp.Matrix:
    q = d - 1
    ballot = super_ballot(q)
    form = central_inverse_from_blocks(d).inv() * reverse_identity(q)
    return sp.simplify(ballot * form * ballot.T)


for d in range(3, 16):
    small = compressed(d)
    large = compressed(d + 2)[1:-1, 1:-1]
    q = small.rows
    cross_failures = []
    for row in range(q):
        for column in range(q):
            if small[row, column] == 0:
                continue
            # Diagonal congruence would make every 2x2 cross ratio based at
            # (0,0) agree whenever the four entries are nonzero.
            if (
                small[0, 0]
                and small[0, column]
                and small[row, 0]
                and large[0, 0]
                and large[0, column]
                and large[row, 0]
            ):
                identity = sp.factor(
                    large[row, column]
                    * large[0, 0]
                    * small[row, 0]
                    * small[0, column]
                    - small[row, column]
                    * small[0, 0]
                    * large[row, 0]
                    * large[0, column]
                )
                if identity != 0:
                    cross_failures.append((row, column, identity))
                    break
        if cross_failures:
            break
    print(f"d={d}: diagonal_congruence={not cross_failures}, first={cross_failures[:1]}")
