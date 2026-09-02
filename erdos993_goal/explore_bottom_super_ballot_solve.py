#!/usr/bin/env python3
"""Inspect the triangular solve behind the super-ballot row polynomials."""

import sympy as sp

from verify_bottom_barycentric_sturm_reduction import super_ballot
from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


T = sp.symbols("t")


for d in range(3, 11):
    q = d - 1
    ballot = super_ballot(q)
    power_curve = sp.Matrix([T**index for index in range(q)])
    ballot_polynomials = sp.simplify(ballot.T * power_curve)
    central = central_inverse_from_blocks(d).inv()
    solved = sp.simplify(central * reverse_identity(q) * ballot_polynomials)
    print(f"d={d}")
    for index, polynomial in enumerate(solved):
        print(f"  z[{index}]={sp.factor(polynomial)}")
