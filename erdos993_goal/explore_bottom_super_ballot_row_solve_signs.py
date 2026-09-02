#!/usr/bin/env python3
"""Test signs of (adjacent rows of Tau) K before the final positive factor."""

import sympy as sp

from verify_bottom_barycentric_sturm_reduction import super_ballot
from verify_bottom_universal_schur_tp import central_inverse_from_blocks


for d in range(3, 41):
    q = d - 1
    ballot = super_ballot(q)
    central = central_inverse_from_blocks(d).inv()
    peak = (d + 1) // 3 - 1
    failures = []
    zero_count = positive_count = 0
    for row in range(1, q):
        expected = 1 if row <= peak else -1
        adjacent = ballot[row, :] - ballot[row - 1, :]
        solved = sp.simplify(adjacent * central)
        for column, value in enumerate(solved):
            value = sp.factor(value)
            if value == 0:
                zero_count += 1
            elif expected * value > 0:
                positive_count += 1
            else:
                failures.append((row, column, value, expected))
                break
        if failures:
            break
    print(
        f"d={d}, peak={peak}, good={positive_count}, zeros={zero_count}, "
        f"first_failure={failures[:1]}"
    )
