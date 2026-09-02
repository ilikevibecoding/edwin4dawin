"""Test termwise column compatibility of the deflated constant/cut matrices.

If every determinant obtained by independently choosing column j from M0 or
M1 is nonnegative, then every coefficient of every minor of M0+t M1 is a
sum of nonnegative terms.  This is stronger than the desired pencil lemma
but substantially weaker than total positivity of a doubled matrix because
at most one copy of each column is selected.
"""

from __future__ import annotations

from itertools import combinations, product

import sympy as sp

from verify_bottom_q_pencil_null_deflation import null_coordinate_data


def first_bad(d: int):
    q = d - 1
    _, _, _, m0, m1 = null_coordinate_data(d)
    checked = 0
    for order in range(1, q + 1):
        for rows in combinations(range(q), order):
            for columns in combinations(range(q), order):
                for mask in product((0, 1), repeat=order):
                    # The all-M0 term is known positive/TN; zero M1 columns
                    # are harmless and skipped to reduce work.
                    chosen = sp.Matrix.hstack(
                        *[
                            (m1 if bit else m0)[:, column]
                            for column, bit in zip(columns, mask)
                        ]
                    )
                    value = sp.factor(chosen.extract(rows, range(order)).det(method="domain-ge"))
                    checked += 1
                    if value < 0:
                        return checked, (order, rows, columns, mask, value)
    return checked, None


def main() -> None:
    for d in range(3, 9):
        checked, bad = first_bad(d)
        print(f"d={d} checked={checked} first_bad={bad}", flush=True)
        if bad is not None:
            break


if __name__ == "__main__":
    main()
