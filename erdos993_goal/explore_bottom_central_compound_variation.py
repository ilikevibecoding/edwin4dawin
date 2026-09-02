"""Inspect sign variation in compounds of the central inverse-M-matrix.

For the actual factor D=A K V, Cauchy--Binet at order k is
D^(k)=A^(k) K^(k) V^(k).  The outside compounds are entrywise positive.
This script tests whether rows/columns of the signed central compound have a
small, structured number of sign changes that could be removed by the two
outer variation-diminishing factors.
"""

from __future__ import annotations

from itertools import combinations

import sympy as sp

from verify_bottom_universal_schur_tp import central_inverse_from_blocks


def compound(matrix: sp.Matrix, order: int):
    row_sets = list(combinations(range(matrix.rows), order))
    column_sets = list(combinations(range(matrix.cols), order))
    result = sp.Matrix(
        len(row_sets),
        len(column_sets),
        lambda i, j: sp.factor(
            matrix.extract(row_sets[i], column_sets[j]).det(method="domain-ge")
        ),
    )
    return row_sets, column_sets, result


def variations(values) -> int:
    signs = [int(sp.sign(value)) for value in values if value != 0]
    return sum(left != right for left, right in zip(signs, signs[1:]))


def main() -> None:
    for d in range(3, 10):
        q = d - 1
        kernel = central_inverse_from_blocks(d).inv()
        records = []
        for order in range(1, min(5, q) + 1):
            _, _, lifted = compound(kernel, order)
            row_variations = [variations(lifted.row(i)) for i in range(lifted.rows)]
            column_variations = [variations(lifted[:, j]) for j in range(lifted.cols)]
            negative = sum(int(bool(value < 0)) for value in lifted)
            records.append(
                (
                    order,
                    lifted.shape,
                    negative,
                    max(row_variations, default=0),
                    max(column_variations, default=0),
                    sorted(set(row_variations)),
                    sorted(set(column_variations)),
                )
            )
        print(f"d={d} records={records}", flush=True)


if __name__ == "__main__":
    main()
