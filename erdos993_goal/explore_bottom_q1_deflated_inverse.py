#!/usr/bin/env python3
"""Inspect the inverse of the canonical local-null deflation of Q1."""

from __future__ import annotations

import sympy as sp

from explore_bottom_q1_deflation_pencil_match import deflated


for d in range(3, 13):
    middle = deflated(d)
    n = middle.rows
    signs = sp.diag(*[(-1) ** i for i in range(n)])
    inverse = sp.simplify(signs * middle.inv() * signs)
    print(f"d={d}, n={n}")
    print(" signs:")
    for row in range(n):
        print("  " + "".join("+" if inverse[row, col] > 0 else "-" if inverse[row, col] < 0 else "0" for col in range(n)))
    if d <= 7:
        print(inverse)
