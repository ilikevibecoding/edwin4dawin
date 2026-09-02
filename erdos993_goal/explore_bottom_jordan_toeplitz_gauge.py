"""Search the commuting Toeplitz gauge in the deflated Jordan factorization.

If R=M0^{-1}M1=S J S^{-1}, then for every invertible upper-Toeplitz P
commuting with J,

  M0+tM1 = (M0 S P) (I+tJ) (P^{-1} S^{-1}).

The canonical P=I leaves the right factor sign-indefinite.  This script
searches for gauges P for which both outside factors are TN.
"""

from __future__ import annotations

from itertools import combinations, product

import numpy as np
import sympy as sp

from verify_bottom_q_pencil_null_deflation import null_coordinate_data


def jordan_data(d: int):
    _, _, _, m0, m1 = null_coordinate_data(d)
    q = d - 1
    relative = sp.simplify(m0.inv() * m1)
    chain = [sp.eye(q)[:, 0]]
    tail = relative[:, 1:q]
    for _ in range(1, q):
        solution = sp.simplify(tail.solve_least_squares(chain[-1]))
        chain.append(sp.Matrix.vstack(sp.zeros(1, 1), solution))
    s = sp.Matrix.hstack(*chain)
    return m0, s


def toeplitz(parameters):
    q = len(parameters) + 1
    return sp.Matrix(
        q,
        q,
        lambda i, j: 0 if j < i else (1 if j == i else parameters[j - i - 1]),
    )


def all_minor_values(matrix: sp.Matrix):
    for order in range(1, matrix.rows + 1):
        for rows in combinations(range(matrix.rows), order):
            for columns in combinations(range(matrix.cols), order):
                yield sp.factor(matrix.extract(rows, columns).det(method="domain-ge"))


def first_negative(matrix: sp.Matrix):
    for value in all_minor_values(matrix):
        if value < 0:
            return value
    return None


def score_numeric(left: np.ndarray, right: np.ndarray) -> float:
    """Minimum normalized minor; scale-invariant enough for a rough search."""
    q = left.shape[0]
    worst = float("inf")
    for matrix in (left, right):
        scale = max(1.0, float(np.max(np.abs(matrix))))
        for order in range(1, q + 1):
            denom = scale**order
            for rows in combinations(range(q), order):
                for columns in combinations(range(q), order):
                    value = float(np.linalg.det(matrix[np.ix_(rows, columns)])) / denom
                    worst = min(worst, value)
    return worst


def grid_d4():
    m0, s = jordan_data(4)
    best = None
    for p1 in [sp.Rational(i, 20) for i in range(-90, -40)]:
        for p2 in [sp.Rational(i, 10) for i in range(-100, 301)]:
            p = toeplitz([p1, p2])
            left = sp.simplify(m0 * s * p)
            right = sp.simplify(p.inv() * s.inv())
            if first_negative(left) is None and first_negative(right) is None:
                return p1, p2, left, right
    return best


def main() -> None:
    result = grid_d4()
    print(f"d=4 grid_result={None if result is None else result[:2]}", flush=True)
    if result is not None:
        p1, p2, left, right = result
        print(f" left_TN={first_negative(left) is None} right_TN={first_negative(right) is None}")
        print(" left=", left.applyfunc(sp.factor))
        print(" right=", right.applyfunc(sp.factor))


if __name__ == "__main__":
    main()
