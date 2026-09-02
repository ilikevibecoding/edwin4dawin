#!/usr/bin/env python3
"""Print primitive minimal-degree Bernstein coefficients of D_(d,i)."""

import sympy as sp

from verify_bottom_barycentric_sturm_reduction import (
    bernstein_coefficients,
    super_ballot,
)
from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


T = sp.symbols("t")


for d in range(5, 12):
    q = d - 1
    ballot = super_ballot(q)
    form = central_inverse_from_blocks(d).inv() * reverse_identity(q)
    compressed = sp.simplify(ballot * form * ballot.T)
    peak = (d + 1) // 3 - 1
    print(f"d={d}, peak={peak}")
    for row in range(1, q):
        sign = 1 if row <= peak else -1
        polynomial = sp.Poly(
            sign
            * sum(
                (compressed[row, column] - compressed[row - 1, column]) * T**column
                for column in range(q)
            ),
            T,
        )
        coefficients = bernstein_coefficients(polynomial, polynomial.degree())
        common = sp.gcd_list([sp.numer(value) for value in coefficients])
        print(f"  i={row}, degree={polynomial.degree()}: {[sp.factor(value/common) for value in coefficients]}")
