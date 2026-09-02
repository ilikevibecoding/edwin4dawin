#!/usr/bin/env python3
"""Inspect Neville parameters of the full Newton-coordinate matrix."""

from fast_bottom_forward import beta_coefficients, matmul, right_coefficient_matrix
from probe_beta_newton_coordinates import beta_newton_lower, inverse_lower_unit


def transformed(q):
    lower_inverse = inverse_lower_unit(beta_newton_lower(q))
    upper = matmul(lower_inverse, beta_coefficients(q))
    return matmul(upper, right_coefficient_matrix(q))


def neville_parameters(matrix):
    work = [row[:] for row in matrix]
    rows, columns = len(work), len(work[0])
    parameters = []
    for column in range(min(rows - 1, columns)):
        local = []
        for row in range(rows - 1, column, -1):
            denominator = work[row - 1][column]
            multiplier = work[row][column] / denominator
            local.append((row, multiplier))
            for j in range(column, columns):
                work[row][j] -= multiplier * work[row - 1][j]
        parameters.append(local)
    return parameters, [work[i][i] for i in range(min(rows, columns))]


def compact(value):
    return f"{value.numerator}/{value.denominator}"


def main():
    for q in range(2, 9):
        matrix = transformed(q)
        forward, pivots = neville_parameters(matrix)
        transpose, transpose_pivots = neville_parameters(
            [list(row) for row in zip(*matrix)]
        )
        assert all(value > 0 for level in forward for _, value in level)
        assert all(value > 0 for level in transpose for _, value in level)
        print(f"q={q}")
        print("  forward column0", [compact(value) for _, value in forward[0]])
        print("  transpose column0", [compact(value) for _, value in transpose[0]])
        print("  forward last", compact(forward[-1][0][1]))
        print("  transpose last", compact(transpose[-1][0][1]))
        if q <= 4:
            print(
                "  all forward",
                [[(row, compact(value)) for row, value in level] for level in forward],
            )
            print(
                "  all transpose",
                [[(row, compact(value)) for row, value in level] for level in transpose],
            )


if __name__ == "__main__":
    main()
