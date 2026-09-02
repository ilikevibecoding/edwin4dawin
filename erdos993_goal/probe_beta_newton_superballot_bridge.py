#!/usr/bin/env python3
"""Inspect the bridge between beta Newton coordinates and super-ballot rows."""

from fractions import Fraction as F
from math import comb

from fast_bottom_forward import beta_coefficients, inverse_upper, matmul
from probe_beta_newton_coordinates import (
    beta_newton_lower,
    inverse_lower_unit,
    primitive_integer_row,
)
from verify_bottom_derivative_completed_boundary_tn import rectangular_neville


def super_ballot(size):
    return [
        [
            F(2 * row + 1, column + 1)
            * comb(2 * row, row)
            * comb(2 * (column - row), column - row)
            if row <= column
            else F(0)
            for column in range(size)
        ]
        for row in range(size)
    ]


def summary(matrix):
    values = [value for row in matrix for value in row if value]
    return {
        "positive": sum(value > 0 for value in values),
        "negative": sum(value < 0 for value in values),
        "nonzero": len(values),
    }


def neville_pair(matrix):
    forward = rectangular_neville(matrix)
    transpose = rectangular_neville([list(row) for row in zip(*matrix)])
    return forward["status"], transpose["status"]


def main():
    for q in range(2, 31):
        lower = beta_newton_lower(q)
        upper = matmul(inverse_lower_unit(lower), beta_coefficients(q))
        ballot = super_ballot(q)
        ballot_inverse = inverse_upper(ballot)
        right_quotient = matmul(upper, ballot_inverse)
        left_quotient = matmul(ballot_inverse, upper)
        print(
            f"q={q} U*Tau^-1={summary(right_quotient)} "
            f"neville={neville_pair(right_quotient)} "
            f"Tau^-1*U={summary(left_quotient)} "
            f"neville={neville_pair(left_quotient)} "
            f"Tau_neville={neville_pair(ballot)}"
        )
        if q <= 4:
            print("  U*Tau^-1 primitive rows:")
            for row in right_quotient:
                print("   ", primitive_integer_row(row))


if __name__ == "__main__":
    main()
