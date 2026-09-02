"""Factor the actual balanced Schur tail through forward differences.

For d=2m+3 and q=d-1, the maximal reversed tail has the collocation form

  R_q(x,j) = C_{x+3} p_j(x) / D_q(x),  0<=x,j<q.

The actual m-square tail uses rows 0..m-1 and columns q-m..q-1.  On those
integer nodes, Newton interpolation gives

  p_j(x) = sum_{k=0}^{m-1} binom(x,k) Delta^k p_j(0).

Thus actual = positive diagonal * Pascal_m * forward_difference_matrix.
Proving the latter STP for all m suffices for the actual bottom endpoint and
is strictly weaker than the maximal (2m+2)-square coefficient theorem.
"""

from __future__ import annotations

from itertools import combinations

import sympy as sp

from verify_bottom_schur_chebyshev_coefficients import X, maximal_tail_data
from verify_bottom_universal_schur_tp import (
    reverse_identity,
    schur_tail,
    universal_matrix,
)


def forward_difference(polynomial: sp.Poly, order: int) -> sp.Expr:
    return sp.factor(
        sum(
            (-1) ** (order - j) * sp.binomial(order, j) * polynomial.eval(j)
            for j in range(order + 1)
        )
    )


def forward_matrix(m: int) -> tuple[sp.Matrix, sp.Matrix, sp.Matrix]:
    d = 2 * m + 3
    q = d - 1
    _, polynomials, denominator = maximal_tail_data(d)
    selected = polynomials[q - m :]
    differences = sp.Matrix(
        m,
        m,
        lambda order, column: forward_difference(selected[column], order),
    )
    pascal = sp.Matrix(m, m, lambda row, order: sp.binomial(row, order))
    scaling = sp.diag(
        *[
            sp.cancel(sp.catalan(row + 3) / denominator.subs(X, row))
            for row in range(m)
        ]
    )
    return scaling, pascal, differences


def first_nonpositive_minor(matrix: sp.Matrix):
    checked = 0
    for order in range(1, matrix.rows + 1):
        for rows in combinations(range(matrix.rows), order):
            for columns in combinations(range(matrix.cols), order):
                value = sp.factor(matrix.extract(rows, columns).det(method="domain-ge"))
                checked += 1
                if value <= 0:
                    return checked, (order, rows, columns, value)
    return checked, None


def main() -> None:
    for m in range(1, 11):
        d = 2 * m + 3
        scaling, pascal, differences = forward_matrix(m)
        actual = -schur_tail(universal_matrix(3 * m + 3, d), d) * reverse_identity(m)
        assert sp.simplify(scaling * pascal * differences - actual) == sp.zeros(m)
        assert all(value > 0 for value in differences)

        checked = 0
        obstruction = None
        if m <= 6:
            checked, obstruction = first_nonpositive_minor(differences)
            assert obstruction is None

        print(
            f"m={m} identity=True positive_entries=True "
            f"exhaustive_minor_checks={checked} obstruction={obstruction}",
            flush=True,
        )
        if m <= 4:
            print(" differences=", differences.applyfunc(sp.factor), flush=True)


if __name__ == "__main__":
    main()
