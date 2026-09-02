#!/usr/bin/env python3
"""Inspect J Tau^T times the power-to-Bernstein coefficient transform."""

import sympy as sp

from verify_bottom_barycentric_sturm_reduction import super_ballot
from verify_bottom_universal_schur_tp import reverse_identity


for q in range(2, 10):
    degree = q - 1
    ballot = super_ballot(q)
    transform = sp.Matrix(
        q,
        q,
        lambda power, index: (
            sp.binomial(index, power) / sp.binomial(degree, power)
            if power <= index
            else 0
        ),
    )
    right = sp.simplify(reverse_identity(q) * ballot.T * transform)
    print(f"q={q}")
    print(right)
