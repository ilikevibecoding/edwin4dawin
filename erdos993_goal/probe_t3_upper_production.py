#!/usr/bin/env python3
"""Inspect finite production matrices of the reversed upper factor."""

from fast_bottom_forward import eye, matmul
from probe_confluent_transition_sections import inverse_matrix, print_matrix
from probe_t3_mixed_upper_rows import upper_factor


def production(q):
    upper = upper_factor(q)
    reversal = [row[::-1] for row in eye(q)]
    lower = matmul(matmul(reversal, upper), reversal)
    leading = [row[: q - 1] for row in lower[: q - 1]]
    next_rows = [row[:] for row in lower[1:]]
    return matmul(inverse_matrix(leading), next_rows)


def main():
    for q in range(2, 9):
        matrix = production(q)
        print(f"\nq={q}")
        print_matrix("production", matrix)
        print(
            "signs",
            {
                "positive": sum(value > 0 for row in matrix for value in row),
                "negative": sum(value < 0 for row in matrix for value in row),
                "zero": sum(value == 0 for row in matrix for value in row),
            },
        )


if __name__ == "__main__":
    main()
