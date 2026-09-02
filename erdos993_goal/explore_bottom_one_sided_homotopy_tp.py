#!/usr/bin/env python3
"""Test whether the homotopy already becomes TP after the left beta factor."""

from __future__ import annotations

import itertools

import sympy as sp

from verify_bottom_reverse_tp_offdiagonal_homotopy import T, homotopy_data, initial_minors
from verify_bottom_schur_chebyshev_coefficients import coefficient_matrix
from verify_bottom_schur_two_sided_reverse_tp import cleared_catalan_basis


def bernstein_coefficients(polynomial: sp.Poly):
    degree = polynomial.degree()
    powers = list(reversed(polynomial.all_coeffs()))
    return [
        sp.factor(
            sum(
                powers[i] * sp.binomial(k, i) / sp.binomial(degree, i)
                for i in range(k + 1)
            )
        )
        for k in range(degree + 1)
    ]


def first_bad(matrix: sp.Matrix, symbolic: str | None, exhaustive: bool):
    if exhaustive:
        source = (
            matrix.extract(rows, columns)
            for order in range(1, min(matrix.shape) + 1)
            for rows in itertools.combinations(range(matrix.rows), order)
            for columns in itertools.combinations(range(matrix.cols), order)
        )
    else:
        source = initial_minors(matrix)
    for index, minor in enumerate(source):
        value = sp.factor(minor.det(method="domain-ge"))
        if symbolic:
            numerator, denominator = sp.fraction(sp.cancel(value))
            polynomial = sp.Poly(numerator, T)
            coefficients = (
                polynomial.all_coeffs()
                if symbolic == "power"
                else bernstein_coefficients(polynomial)
            )
            if not (denominator > 0 and all(coefficient > 0 for coefficient in coefficients)):
                return index, value, coefficients
        elif value <= 0:
            return index, value
    return None


for d in range(3, 16):
    q = d - 1
    basis = coefficient_matrix(cleared_catalan_basis(q))
    _, _, _, _, central_pencil = homotopy_data(d)
    left = sp.simplify(basis * central_pencil.inv())
    power_bad = first_bad(left, symbolic="power", exhaustive=False)
    bernstein_bad = first_bad(left, symbolic="bernstein", exhaustive=False)
    endpoint_bad = first_bad(left.subs(T, 1), symbolic=None, exhaustive=d <= 8)
    print(
        f"d={d}: power_initial={power_bad}; "
        f"bernstein_initial={bernstein_bad}; endpoint={endpoint_bad}"
    )
