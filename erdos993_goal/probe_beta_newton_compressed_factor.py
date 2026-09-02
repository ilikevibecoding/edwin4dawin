#!/usr/bin/env python3
"""Test the compressed factor in the Newton/super-ballot/Hankel split.

Let B=L U be the beta Newton factorization, Tau the super-ballot triangle,
K the central inverse, and J reversal.  The Catalan Hankel matrix factors as

    H = Tau^T V D,

where V[a,r]=(r+3)(r+4)/((a+r+3)(a+r+4)) and D[r,r]=C_(r+3).
Consequently

    U K J H J = (U K J Tau^T J) (J V J) (J D J).

The latter two factors are uniformly TN.  This probe audits the first upper-
triangular factor WJ=U K J Tau^T J exactly.
"""

from fractions import Fraction as F

from fast_bottom_forward import (
    beta_coefficients,
    catalan,
    central_k,
    eye,
    matmul,
    right_coefficient_matrix,
)
from probe_beta_newton_coordinates import (
    beta_newton_lower,
    inverse_lower_unit,
    primitive_integer_row,
)
from probe_beta_newton_superballot_bridge import super_ballot
from verify_bottom_derivative_completed_boundary_tn import rectangular_neville


def transpose(matrix):
    return [list(row) for row in zip(*matrix)]


def reversal(size):
    return [row[::-1] for row in eye(size)]


def neville_pair(matrix):
    return rectangular_neville(matrix), rectangular_neville(transpose(matrix))


def moment_v(size):
    return [
        [
            F((column + 3) * (column + 4),
              (row + column + 3) * (row + column + 4))
            for column in range(size)
        ]
        for row in range(size)
    ]


def diagonal(values):
    size = len(values)
    return [
        [F(values[row]) if row == column else F(0) for column in range(size)]
        for row in range(size)
    ]


def main():
    for q in range(2, 21):
        j = reversal(q)
        tau = super_ballot(q)
        v = moment_v(q)
        d = diagonal([catalan(index + 3) for index in range(q)])
        h = [[F(catalan(row + column + 3)) for column in range(q)] for row in range(q)]
        assert matmul(matmul(transpose(tau), v), d) == h

        lower = beta_newton_lower(q)
        upper = matmul(inverse_lower_unit(lower), beta_coefficients(q))
        k = central_k(q + 1)
        first = matmul(matmul(matmul(matmul(upper, k), j), transpose(tau)), j)
        middle = matmul(matmul(j, v), j)
        last = matmul(matmul(j, d), j)
        transformed = matmul(
            inverse_lower_unit(lower),
            matmul(beta_coefficients(q), right_coefficient_matrix(q)),
        )
        assert matmul(matmul(first, middle), last) == transformed

        first_forward, first_transpose = neville_pair(first)
        middle_forward, middle_transpose = neville_pair(middle)
        print(
            f"q={q} first=({first_forward['status']},"
            f"{first_transpose['status']}) middle=("
            f"{middle_forward['status']},{middle_transpose['status']})"
        )
        if q <= 5:
            for row in first:
                print("  ", primitive_integer_row(row))


if __name__ == "__main__":
    main()
