#!/usr/bin/env python3
"""Scan asymmetric fractional-power splits K=L^a D (L^(1-a))#."""

import sympy as sp

from verify_bottom_reverse_cholesky_factorization import reverse_cholesky_data
from verify_bottom_universal_schur_tp import neville_parameters


def unipotent_power(matrix: sp.Matrix, exponent: sp.Rational) -> sp.Matrix:
    nilpotent = matrix - sp.eye(matrix.rows)
    return sum(
        (sp.binomial(exponent, power) * nilpotent**power for power in range(matrix.rows)),
        sp.zeros(matrix.rows),
    )


def is_strictly_tp(matrix: sp.Matrix) -> bool:
    try:
        rows = neville_parameters(matrix)
        columns = neville_parameters(matrix.T)
    except AssertionError:
        return False
    return all(value > 0 for group in rows + columns for value in group)


for d in range(6, 11):
    basis, central, diagonal, *_ = reverse_cholesky_data(d)
    normalized = central * diagonal.inv()
    passing = []
    for numerator in range(41):
        exponent = sp.Rational(numerator, 40)
        left = basis * unipotent_power(normalized, exponent)
        right = basis * unipotent_power(normalized, 1 - exponent)
        if is_strictly_tp(left) and is_strictly_tp(right):
            passing.append(exponent)
    print(f"d={d}: passing exponents={passing}")
