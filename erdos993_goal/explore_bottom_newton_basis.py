#!/usr/bin/env python3
"""Inspect the central kernel in degree-graded rising-factorial bases."""

import itertools

import sympy as sp

from verify_bottom_schur_chebyshev_coefficients import X, coefficient_matrix
from verify_bottom_schur_two_sided_reverse_tp import two_sided_data
from verify_bottom_universal_schur_tp import reverse_identity


def minor_sign_counts(matrix: sp.Matrix):
    positive = negative = zero = 0
    first_negative = None
    for order in range(1, matrix.rows + 1):
        for rows in itertools.combinations(range(matrix.rows), order):
            for columns in itertools.combinations(range(matrix.cols), order):
                value = sp.factor(matrix.extract(rows, columns).det())
                if value > 0:
                    positive += 1
                elif value < 0:
                    negative += 1
                    first_negative = first_negative or (rows, columns, value)
                else:
                    zero += 1
    return positive, negative, zero, first_negative


for shift in range(0, 8):
    print(f"shift={shift}")
    for d in range(3, 9):
        q = d - 1
        reversal = reverse_identity(q)
        symmetric = two_sided_data(d)[2]
        newton = coefficient_matrix(
            [sp.Poly(sp.rf(X + shift, degree), X) for degree in range(q)]
        )
        central = sp.simplify(newton.inv() * symmetric * newton.inv().T)
        target = central * reversal
        counts = minor_sign_counts(target)
        print(
            f"  d={d}: +{counts[0]} -{counts[1]} 0={counts[2]}, "
            f"first_negative={counts[3]}"
        )
