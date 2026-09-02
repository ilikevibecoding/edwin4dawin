#!/usr/bin/env python3
"""Test TN of the triangular core in the root-evaluation factorization of Q1 J."""

from __future__ import annotations

from itertools import combinations

import sympy as sp

from verify_bottom_reverse_tp_offdiagonal_homotopy import checker, homotopy_data, initial_minors
from verify_bottom_universal_schur_tp import reverse_identity


def root_core(d: int):
    q = d - 1
    n = q - 1
    _, _, _, q1, _ = homotopy_data(d)
    form = sp.simplify(q1 * reverse_identity(q))
    roots = [sp.Rational(1, 5 + index) for index in range(n)]
    vandermonde = sp.Matrix(q, n, lambda power, column: roots[column] ** power)
    square = vandermonde[:n, :]
    reduced = sp.simplify(square.inv() * form[:n, :n] * square.inv().T)
    assert sp.simplify(vandermonde * reduced * vandermonde.T - form) == sp.zeros(q)
    positive_anti = sp.simplify((-1) ** (n - 1) * checker(n) * reduced * checker(n))
    triangular = positive_anti * reverse_identity(n)
    return vandermonde, reduced, triangular


def all_minors(matrix: sp.Matrix):
    for order in range(1, matrix.rows + 1):
        for rows in combinations(range(matrix.rows), order):
            for columns in combinations(range(matrix.cols), order):
                yield rows, columns, sp.factor(matrix.extract(rows, columns).det())


for d in range(3, 16):
    _, _, triangular = root_core(d)
    first_bad = None
    positive = zero = 0
    source = all_minors(triangular) if d <= 9 else (
        (tuple(), tuple(), sp.factor(minor.det(method="domain-ge")))
        for minor in initial_minors(triangular)
    )
    for rows, columns, determinant in source:
        if determinant < 0:
            first_bad = (rows, columns, determinant)
            break
        positive += int(bool(determinant > 0))
        zero += int(bool(determinant == 0))
    print(
        f"d={d} n={triangular.rows} entry_signs="
        f"{sorted(set(sp.sign(value) for value in triangular))} "
        f"positive={positive} zero={zero} first_bad={first_bad}",
        flush=True,
    )
    if first_bad is not None:
        break
