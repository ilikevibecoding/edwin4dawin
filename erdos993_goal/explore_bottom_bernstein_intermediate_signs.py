#!/usr/bin/env python3
"""Inspect sign patterns in (adjacent Tau rows) K before the positive right factor."""

import sympy as sp

from verify_bottom_barycentric_sturm_reduction import difference_matrix, super_ballot
from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


for d in range(3, 16):
    q = d - 1
    Tau = super_ballot(q)
    K = central_inverse_from_blocks(d).inv()
    raw = sp.simplify(difference_matrix(q) * Tau * K)
    peak = (d + 1) // 3 - 1
    signed = sp.diag(*[(1 if i + 1 <= peak else -1) for i in range(q - 1)]) * raw
    print(f"d={d}, peak={peak}")
    for i in range(q - 1):
        print(" ", i + 1, "".join("+" if x > 0 else "-" if x < 0 else "0" for x in signed.row(i)))
