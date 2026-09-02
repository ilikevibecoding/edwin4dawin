"""Locate total-positivity inside the actual forward-difference factorization."""

from __future__ import annotations

from itertools import combinations

import sympy as sp

from explore_bottom_actual_forward_difference_factor import forward_difference
from verify_bottom_schur_two_sided_reverse_tp import cleared_catalan_basis
from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


def first_negative(matrix: sp.Matrix, max_order: int | None = None):
    checked = 0
    limit = min(matrix.shape) if max_order is None else min(max_order, *matrix.shape)
    for order in range(1, limit + 1):
        for rows in combinations(range(matrix.rows), order):
            for columns in combinations(range(matrix.cols), order):
                value = sp.factor(matrix.extract(rows, columns).det(method="domain-ge"))
                checked += 1
                if value < 0:
                    return checked, (order, rows, columns, value)
    return checked, None


def components(m: int):
    d = 2 * m + 3
    q = d - 1
    beta = cleared_catalan_basis(q)
    delta_beta = sp.Matrix(
        m,
        q,
        lambda k, p: forward_difference(beta[p], k),
    )
    central = central_inverse_from_blocks(d).inv()
    catalan = sp.Matrix(q, q, lambda i, j: sp.catalan(i + j + 3))
    reversed_catalan = reverse_identity(q) * catalan * reverse_identity(q)
    selected = reversed_catalan[:, q - m :]
    return {
        "A=forward_beta": delta_beta,
        "V=selected_catalan": selected,
        "A*K": sp.simplify(delta_beta * central),
        "K*V": sp.simplify(central * selected),
        "A*K*V": sp.simplify(delta_beta * central * selected),
    }


def main() -> None:
    for m in range(1, 8):
        print(f"m={m}", flush=True)
        for name, matrix in components(m).items():
            checked, bad = first_negative(matrix, max_order=m if m <= 5 else 2)
            print(f" {name} shape={matrix.shape} checked={checked} bad={bad}", flush=True)


if __name__ == "__main__":
    main()
