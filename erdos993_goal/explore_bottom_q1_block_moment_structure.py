#!/usr/bin/env python3
"""Test diagonal equivalence of Q1 J to small-block Hankel/Toeplitz forms."""

from __future__ import annotations

from math import gcd
from functools import reduce

import sympy as sp

from verify_bottom_reverse_tp_offdiagonal_homotopy import homotopy_data
from verify_bottom_universal_schur_tp import reverse_identity


def lcm(values):
    result = 1
    for value in values:
        result = sp.ilcm(result, int(value))
    return result


def diagonal_pattern(matrix: sp.Matrix, block: int, kind: str):
    n = matrix.rows
    entries = [(i, j) for i in range(n) for j in range(n) if matrix[i, j] != 0]
    classes = []
    for i, j in entries:
        coarse_i, residue_i = divmod(i, block)
        coarse_j, residue_j = divmod(j, block)
        coarse = coarse_i + coarse_j if kind == "hankel" else coarse_i - coarse_j
        classes.append((residue_i, residue_j, coarse))
    unique_classes = sorted(set(classes))
    class_index = {value: index for index, value in enumerate(unique_classes)}
    design = sp.zeros(len(entries), 2 * n + len(unique_classes))
    for row, ((i, j), pattern) in enumerate(zip(entries, classes)):
        design[row, i] = 1
        design[row, n + j] = 1
        design[row, 2 * n + class_index[pattern]] = 1
    for relation in design.T.nullspace():
        denominator = lcm(value.q for value in relation)
        powers = [int(value * denominator) for value in relation]
        common = reduce(gcd, (abs(value) for value in powers if value), 0) or 1
        powers = [value // common for value in powers]
        ratio = sp.Integer(1)
        for power, (i, j) in zip(powers, entries):
            ratio *= matrix[i, j] ** power
        if sp.factor(ratio) != 1:
            return False, (powers, sp.factor(ratio))
    return True, None


for d in range(4, 13):
    q = d - 1
    _, _, _, q1, _ = homotopy_data(d)
    matrix = q1 * reverse_identity(q)
    results = {}
    for block in (1, 2, 3, 4):
        for kind in ("hankel", "toeplitz"):
            passing, witness = diagonal_pattern(matrix, block, kind)
            results[f"{kind}{block}"] = passing
    print(f"d={d} {results}", flush=True)
