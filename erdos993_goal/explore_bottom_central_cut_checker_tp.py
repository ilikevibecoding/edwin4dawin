#!/usr/bin/env python3
"""Test total positivity of the checker-normalized central off-diagonal cut."""

from __future__ import annotations

from itertools import combinations

import sympy as sp

from verify_bottom_reverse_tp_offdiagonal_homotopy import checker, initial_minors
from verify_bottom_universal_schur_tp import central_inverse_from_blocks


def all_minors(matrix: sp.Matrix):
    for order in range(1, matrix.rows + 1):
        for rows in combinations(range(matrix.rows), order):
            for columns in combinations(range(matrix.cols), order):
                yield rows, columns, sp.factor(matrix.extract(rows, columns).det())


for d in range(3, 21):
    q = d - 1
    n = q - 1
    central = central_inverse_from_blocks(d)
    off = central - sp.diag(*central.diagonal())
    raw_cut = off[:n, 1:]
    # The local checker factors on E_q (Z-D) E_q differ by one index
    # across this shifted square cut, leaving the positive matrix -Z_cut.
    cut = -raw_cut
    entry_signs = sorted(set(sp.sign(value) for value in cut))
    first_bad = None
    positive = zero = 0
    source = all_minors(cut) if d <= 8 else (
        (tuple(), tuple(), sp.factor(minor.det(method="domain-ge")))
        for minor in initial_minors(cut)
    )
    for rows, columns, determinant in source:
        if determinant < 0:
            first_bad = (rows, columns, determinant)
            break
        positive += int(bool(determinant > 0))
        zero += int(bool(determinant == 0))
    print(
        f"d={d} entry_signs={entry_signs} positive={positive} zero={zero} "
        f"first_bad={first_bad}",
        flush=True,
    )
    if first_bad is not None:
        break
