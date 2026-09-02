#!/usr/bin/env python3
"""Search a common TN order for all three subtraction-free homotopy branches.

Write P=I-R, D=diag(1/binom(d,i+1)), and Dm=diag(M).  Then

 T(t) = U Dm V + t (U P) D (R V) + t U D (P V).

For each central index s, branch A is (UP)_s -- (RV)_s, branch B is
U_s -- (PV)_s, and branch C is U_s -- V_s.  Positive diagonal branch
weights then make Cauchy--Binet coefficientwise positive if the left and
right rectangular factors are TN in one common interleaving.
"""

from __future__ import annotations

from fractions import Fraction as F
from itertools import combinations, permutations

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


def main():
    # Branches: 0=(UP,RV), 1=(U,PV), 2=(U,V).
    for q in range(2, 8):
        u = jacobi_upper(q)
        v = beta_checker_inverse(q)
        r = [
            [F((-1) ** (j - i) * catalan(j - i + 1)) if j >= i else F(0) for j in range(q)]
            for i in range(q)
        ]
        identity = eye(q)
        p = [[identity[i][j] - r[i][j] for j in range(q)] for i in range(q)]
        up, rv, pv = matmul(u, p), matmul(r, v), matmul(p, v)
        print("q", q, flush=True)
        survivors = []
        for branch_order in permutations(range(3)):
            order = [(branch, s) for s in range(q) for branch in branch_order]
            left = [
                [up[i][s] if branch == 0 else u[i][s] for branch, s in order]
                for i in range(q)
            ]
            right = [
                list(rv[s]) if branch == 0 else list(pv[s]) if branch == 1 else list(v[s])
                for branch, s in order
            ]
            left_bad = first_negative(left)
            right_bad = first_negative(right)
            if left_bad is None and right_bad is None:
                survivors.append(branch_order)
            else:
                print(branch_order, "L", left_bad, "R", right_bad, flush=True)
        print("survivors", survivors, flush=True)


if __name__ == "__main__":
    main()
