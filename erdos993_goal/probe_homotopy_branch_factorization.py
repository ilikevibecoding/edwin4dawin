#!/usr/bin/env python3
"""Search TN intermediate-node orders for the subtraction-free split of B.

With R the checker Catalan-square Toeplitz matrix and P=I-R,

    D - R D R = P D R + D P.

Hence B = (U P) D (R V) + U D (P V).  If the two horizontal/vertical
concatenations are TN in a common intermediate-node order, Cauchy--Binet
would prove B TN.
"""

from __future__ import annotations

from fractions import Fraction as F
from itertools import combinations

from fast_bottom_forward import catalan, determinant, eye, matmul
from verify_newton_checker_offdiag_homotopy import beta_checker_inverse, jacobi_upper


def first_negative(matrix):
    rows, cols = len(matrix), len(matrix[0])
    for size in range(1, min(rows, cols) + 1):
        for rr in combinations(range(rows), size):
            for cc in combinations(range(cols), size):
                value = determinant([[matrix[i][j] for j in cc] for i in rr])
                if value < 0:
                    return size, rr, cc, value
    return None


def orders(q):
    a = [(0, i) for i in range(q)]
    b = [(1, i) for i in range(q)]
    return {
        "group_ab": a + b,
        "group_ba": b + a,
        "interleave_ab": [x for i in range(q) for x in ((0, i), (1, i))],
        "interleave_ba": [x for i in range(q) for x in ((1, i), (0, i))],
        "nested_ab": a + list(reversed(b)),
        "nested_ba": b + list(reversed(a)),
    }


def main():
    for q in range(2, 8):
        u = jacobi_upper(q)
        v = beta_checker_inverse(q)
        r = [
            [F((-1) ** (j - i) * catalan(j - i + 1)) if j >= i else F(0) for j in range(q)]
            for i in range(q)
        ]
        identity = eye(q)
        p = [[identity[i][j] - r[i][j] for j in range(q)] for i in range(q)]
        up, rv = matmul(u, p), matmul(r, v)
        pv = matmul(p, v)
        print("q", q)
        for name, order in orders(q).items():
            left = [
                [up[i][s] if branch == 0 else u[i][s] for branch, s in order]
                for i in range(q)
            ]
            right = [
                list(rv[s]) if branch == 0 else list(pv[s])
                for branch, s in order
            ]
            print(name, "L", first_negative(left), "R", first_negative(right))


if __name__ == "__main__":
    main()
