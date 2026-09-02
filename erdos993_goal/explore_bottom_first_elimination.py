#!/usr/bin/env python3
"""Inspect one backward-elimination step for adjacent super-ballot rows."""

import sympy as sp

from verify_bottom_barycentric_sturm_reduction import difference_matrix, super_ballot
from verify_bottom_universal_schur_tp import central_inverse_from_blocks


for d in range(4, 18):
    q = d - 1
    Tau = super_ballot(q)
    Z = central_inverse_from_blocks(d)
    delta = difference_matrix(q) * Tau
    peak = (d + 1) // 3 - 1
    print(f"d={d}, peak={peak}")
    for a in range(1, q):
        row = delta.row(a - 1)
        alpha = -row[a - 1] / Z[a - 1, a - 1]
        reduced = sp.simplify(row + alpha * Z.row(a - 1))
        tail = list(reduced)[a:]
        print(
            f" a={a} alpha={sp.factor(alpha)} signs="
            + "".join("+" if x > 0 else "-" if x < 0 else "0" for x in tail)
        )
