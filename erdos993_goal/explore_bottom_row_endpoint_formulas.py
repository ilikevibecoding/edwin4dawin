#!/usr/bin/env python3
"""Print endpoint values of adjacent-row polynomials in factored form."""

import sympy as sp

from verify_bottom_barycentric_sturm_reduction import super_ballot
from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


for d in range(3, 16):
    q = d - 1
    ballot = super_ballot(q)
    form = central_inverse_from_blocks(d).inv() * reverse_identity(q)
    compressed = sp.simplify(ballot * form * ballot.T)
    peak = (d + 1) // 3 - 1
    print(f"d={d}, peak={peak}")
    for row in range(1, q):
        at_zero = sp.factor(compressed[row, 0] - compressed[row - 1, 0])
        at_one = sp.factor(
            sum(compressed[row, column] - compressed[row - 1, column] for column in range(q))
        )
        print(f"  i={row}: D(0)={at_zero}, D(1)={at_one}")
