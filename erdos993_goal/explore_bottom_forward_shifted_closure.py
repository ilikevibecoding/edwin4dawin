"""Test the correctly shifted Schur recurrence for forward matrices.

Define C(n,s) using q=2n+2+s, the last n polynomials of the fixed-q maximal
family, and forward-difference orders 0..n-1.  Removing one row and column
while keeping q fixed sends (n,s) to (n-1,s+2), not to (n-1,0).
"""

from __future__ import annotations

import sympy as sp

from explore_bottom_actual_forward_difference_factor import forward_difference
from explore_bottom_forward_size_recurrence import diagonal_match, signs
from verify_bottom_schur_chebyshev_coefficients import maximal_tail_data


def shifted_forward(n: int, shift: int) -> sp.Matrix:
    q = 2 * n + 2 + shift
    d = q + 1
    polynomials = maximal_tail_data(d)[1][-n:]
    return sp.Matrix(
        n,
        n,
        lambda order, column: forward_difference(polynomials[column], order),
    )


def schur_top_left(matrix: sp.Matrix) -> sp.Matrix:
    return sp.simplify(
        matrix[1:, 1:] - matrix[1:, 0] * matrix[0, 1:] / matrix[0, 0]
    )


def schur_bottom_right(matrix: sp.Matrix) -> sp.Matrix:
    return sp.simplify(
        matrix[:-1, :-1]
        - matrix[:-1, -1] * matrix[-1, :-1] / matrix[-1, -1]
    )


def main() -> None:
    for shift in (0, 2, 4, 6):
        for n in range(2, 8):
            current = shifted_forward(n, shift)
            target = shifted_forward(n - 1, shift + 2)
            records = []
            for name, schur in (
                ("top_left", schur_top_left(current)),
                ("bottom_right", schur_bottom_right(current)),
            ):
                match = diagonal_match(schur, target)
                records.append(
                    (
                        name,
                        match[0],
                        (match[1], match[2]),
                        signs(match[3]),
                        all(value > 0 for value in schur),
                    )
                )
            print(f"n={n} shift={shift} records={records}", flush=True)


if __name__ == "__main__":
    main()
