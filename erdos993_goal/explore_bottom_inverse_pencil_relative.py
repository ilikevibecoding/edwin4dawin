#!/usr/bin/env python3
"""Inspect relative matrices Q0^-1 Q1 and Q1 Q0^-1 in the affine route."""

import sympy as sp

from verify_bottom_reverse_tp_offdiagonal_homotopy import homotopy_data


for d in range(3, 13):
    _, _, q0, q1, _ = homotopy_data(d)
    left = sp.simplify(q0.inv() * q1)
    right = sp.simplify(q1 * q0.inv())
    print(f"d={d}")
    print("Q0^-1 Q1 =")
    print(left)
    print("Q1 Q0^-1 =")
    print(right)
    print("charpoly relative =", sp.factor(left.charpoly().as_expr()))
