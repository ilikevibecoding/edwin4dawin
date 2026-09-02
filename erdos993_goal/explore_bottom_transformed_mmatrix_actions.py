#!/usr/bin/env python3
"""Inspect simple vectors and normalized ratios for M=J H^{-1}."""

import sympy as sp

from verify_bottom_barycentric_sturm_reduction import super_ballot
from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


for d in range(3, 13):
    q = d - 1
    J = reverse_identity(q)
    Tau = super_ballot(q)
    H = sp.simplify(Tau * (central_inverse_from_blocks(d).inv() * J) * Tau.T)
    M = sp.simplify(J * H.inv())
    print(f"d={d}, q={q}")
    for name, vector in (
        ("1", sp.ones(q, 1)),
        ("index+1", sp.Matrix(range(1, q + 1))),
        ("reverse-index", sp.Matrix(range(q, 0, -1))),
        ("diag-inverse", sp.Matrix([1 / M[i, i] for i in range(q)])),
    ):
        print(f"  M*{name}: {[sp.factor(x) for x in M * vector]}")
    print("  normalized offdiag row sums:")
    print([sp.factor(-sum(M[i, j] for j in range(i + 1, q)) / M[i, i]) for i in range(q)])
