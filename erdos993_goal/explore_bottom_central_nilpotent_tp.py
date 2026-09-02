#!/usr/bin/env python3
"""Test total nonnegativity and path structure of the central nilpotent N."""

from __future__ import annotations

import itertools

import sympy as sp

from verify_bottom_universal_schur_tp import central_inverse_from_blocks


def first_negative_minor(matrix: sp.Matrix):
    for order in range(1, matrix.rows + 1):
        for rows in itertools.combinations(range(matrix.rows), order):
            for columns in itertools.combinations(range(matrix.cols), order):
                value = sp.factor(matrix.extract(rows, columns).det())
                if value < 0:
                    return order, rows, columns, value
    return None


for d in range(3, 11):
    z = central_inverse_from_blocks(d)
    diagonal = sp.diag(*z.diagonal())
    n = sp.simplify(-diagonal.inv() * (z - diagonal))
    shifted = sp.simplify(-(z - diagonal)[: d - 2, 1 : d - 1])
    resolvent = sp.simplify((sp.eye(d - 1) - sp.symbols("t") * n).inv())
    print(f"d={d}")
    print(" N first negative minor:", first_negative_minor(n))
    print(" shifted offdiagonal first negative minor:", first_negative_minor(shifted))
    print(" resolvent(t=1) first negative minor:", first_negative_minor(resolvent.subs(sp.symbols("t"), 1)))
    # Each coefficient matrix in the finite resolvent is N^k.  A path-network
    # proof would be especially plausible if every power were TN.
    for power in range(1, d - 1):
        obstruction = first_negative_minor(n**power)
        if obstruction is not None:
            print(f" N^{power} first negative minor:", obstruction)
            break
    else:
        print(" every nonzero N power TN")
