#!/usr/bin/env python3
"""Inspect off-diagonal block ranks of the compressed inverse M-matrix."""

import sympy as sp

from verify_bottom_barycentric_sturm_reduction import super_ballot
from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


for d in range(3, 21):
    q = d - 1
    ballot = super_ballot(q)
    form = central_inverse_from_blocks(d).inv() * reverse_identity(q)
    compressed = sp.simplify(ballot * form * ballot.T)
    inverse_upper = sp.simplify(reverse_identity(q) * compressed.inv())
    ranks = [inverse_upper[:split, split:].rank() for split in range(1, q)]
    print(f"d={d}: upper_offdiagonal_ranks={ranks}")
