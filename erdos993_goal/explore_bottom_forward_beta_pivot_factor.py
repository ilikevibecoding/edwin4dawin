"""Search TP pivot factorizations D_m=A_P B_P.

A is the m by (2m+2) forward-difference collocation of the beta switch
basis and is STP.  For each contiguous m-column pivot block P, test whether
B_P=A_P^{-1}D_m is TN.  A surviving uniform pivot would prove D_m TP.
"""

from __future__ import annotations

from itertools import combinations

import sympy as sp

from explore_bottom_actual_forward_difference_factor import forward_matrix
from explore_bottom_forward_factor_components import components


def first_negative(matrix: sp.Matrix, maximum_order: int | None = None):
    limit = matrix.rows if maximum_order is None else min(matrix.rows, maximum_order)
    for order in range(1, limit + 1):
        for rows in combinations(range(matrix.rows), order):
            for columns in combinations(range(matrix.cols), order):
                value = sp.factor(matrix.extract(rows, columns).det(method="domain-ge"))
                if value < 0:
                    return order, rows, columns, value
    return None


def main() -> None:
    for m in range(1, 9):
        A = components(m)["A=forward_beta"]
        target = forward_matrix(m)[2]
        q = A.cols
        survivors = []
        for start in range(q - m + 1):
            pivot = A[:, start : start + m]
            quotient = sp.simplify(pivot.inv() * target)
            obstruction = first_negative(quotient, None if m <= 6 else 2)
            if obstruction is None and all(value >= 0 for value in quotient):
                survivors.append((start, quotient))
        print(
            f"m={m} contiguous_survivors={[start for start,_ in survivors]}",
            flush=True,
        )
        for start, quotient in survivors[:2]:
            print(
                f" start={start} quotient={quotient.applyfunc(sp.factor) if m<=4 else 'TN'}",
                flush=True,
            )


if __name__ == "__main__":
    main()
