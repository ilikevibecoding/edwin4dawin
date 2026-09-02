#!/usr/bin/env python3
"""Explore closed forms after applying the super-ballot triangle to beta moments."""

import sympy as sp

from verify_bottom_barycentric_sturm_reduction import super_ballot
from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


Y = sp.symbols("y", nonnegative=True)


for d in range(3, 11):
    q = d - 1
    ballot = super_ballot(q)
    weights = sp.Matrix(
        [1 / ((Y + b + 3) * (Y + b + 4)) for b in range(q)]
    )
    transformed = [sp.factor(v) for v in ballot.T * weights]
    rhs = reverse_identity(q) * sp.Matrix(transformed)
    solution = central_inverse_from_blocks(d).inv() * rhs
    values = ballot * solution
    print(f"d={d}")
    print("  Tau^T w:")
    for p, value in enumerate(transformed):
        print(f"    p={p}: {value}")
    print("  x=Z^-1 J Tau^T w:")
    for p, value in enumerate(solution):
        print(f"    p={p}: {sp.factor(value)}")
    print("  adjacent Tau*x:")
    for a in range(1, q):
        print(f"    a={a}: {sp.factor(values[a]-values[a-1])}")
