#!/usr/bin/env python3
"""Inspect relative nilpotents after the canonical null-coordinate deflation."""

from __future__ import annotations

import sympy as sp

from verify_bottom_q_pencil_null_deflation import null_coordinate_data


for d in range(3, 14):
    _, _, _, middle0, middle1 = null_coordinate_data(d)
    left = sp.simplify(middle0.inv() * middle1)
    right = sp.simplify(middle1 * middle0.inv())
    print(f"d={d}, q={d-1}")
    for name, matrix in (("M0^-1 M1", left), ("M1 M0^-1", right)):
        print(f" {name} support/signs:")
        for i in range(matrix.rows):
            print("  " + "".join("+" if matrix[i,j] > 0 else "-" if matrix[i,j] < 0 else "0" for j in range(matrix.cols)))
    if d <= 6:
        print(left)
