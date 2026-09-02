#!/usr/bin/env python3
"""Audit the root-coordinate lower-triangular affine pencil for coefficientwise TN."""

from __future__ import annotations

from itertools import combinations

import sympy as sp

from verify_bottom_reverse_tp_offdiagonal_homotopy import T, checker, homotopy_data, initial_minors
from verify_bottom_universal_schur_tp import reverse_identity


def triangular_pencil(d: int):
    q = d - 1
    _, _, q0, q1, _ = homotopy_data(d)
    nodes = [sp.Rational(1, 4)] + [sp.Rational(1, 5 + index) for index in range(q - 1)]
    vandermonde = sp.Matrix(q, q, lambda power, column: nodes[column] ** power)
    form0 = q0 * reverse_identity(q)
    form1 = q1 * reverse_identity(q)
    reduced0 = sp.simplify(vandermonde.inv() * form0 * vandermonde.inv().T)
    reduced1 = sp.simplify(vandermonde.inv() * form1 * vandermonde.inv().T)
    orientation = (-1) ** (q - 1) * checker(q)
    triangular0 = sp.simplify(orientation * reduced0 * checker(q) * reverse_identity(q))
    triangular1 = sp.simplify(orientation * reduced1 * checker(q) * reverse_identity(q))
    return vandermonde, reduced0, reduced1, triangular0, triangular1


def all_minors(matrix: sp.Matrix):
    for order in range(1, matrix.rows + 1):
        for rows in combinations(range(matrix.rows), order):
            for columns in combinations(range(matrix.cols), order):
                yield rows, columns, matrix.extract(rows, columns)


def polynomial_sign(expression: sp.Expr):
    numerator, denominator = sp.fraction(sp.cancel(expression))
    assert denominator > 0
    coefficients = sp.Poly(numerator, T).all_coeffs()
    return coefficients


for d in range(3, 13):
    _, _, _, triangular0, triangular1 = triangular_pencil(d)
    pencil = triangular0 + T * triangular1
    assert all(value >= 0 for value in triangular0)
    assert all(value <= 0 for value in triangular1)
    endpoint = sp.simplify(triangular0 + triangular1)
    endpoint_first_bad = None
    endpoint_source = all_minors(endpoint) if d <= 9 else (
        (tuple(), tuple(), minor) for minor in initial_minors(endpoint)
    )
    for rows, columns, minor in endpoint_source:
        determinant = sp.factor(minor.det(method="domain-ge"))
        if determinant < 0:
            endpoint_first_bad = (rows, columns, determinant)
            break
    first_bad = None
    positive_coefficients = zero_coefficients = 0
    source = all_minors(pencil) if d <= 8 else (
        (tuple(), tuple(), minor) for minor in initial_minors(pencil)
    )
    for rows, columns, minor in source:
        coefficients = polynomial_sign(sp.factor(minor.det(method="domain-ge")))
        if any(value < 0 for value in coefficients):
            first_bad = (rows, columns, coefficients)
            break
        positive_coefficients += sum(int(bool(value > 0)) for value in coefficients)
        zero_coefficients += sum(int(bool(value == 0)) for value in coefficients)
    print(
        f"d={d} entries0={sum(int(bool(v > 0)) for v in triangular0)} "
        f"negative_entries1={sum(int(bool(v < 0)) for v in triangular1)} "
        f"endpoint_first_bad={endpoint_first_bad} "
        f"positive_coefficients={positive_coefficients} zero_coefficients={zero_coefficients} "
        f"first_bad={first_bad}",
        flush=True,
    )
    if endpoint_first_bad is not None:
        break
