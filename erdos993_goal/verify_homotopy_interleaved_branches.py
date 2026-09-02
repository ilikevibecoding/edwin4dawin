#!/usr/bin/env python3
"""Exact exhaustive audit of the compatible two-branch TN factors.

Let R be the checker Catalan-square Toeplitz matrix, P=I-R, U the Jacobi
upper smoother, and V the universal beta checker inverse.  The proposed
rectangular factors are obtained by interleaving, for each s,

    left columns:  (U P)[:,s], U[:,s]
    right rows:    (R V)[s,:], (P V)[s,:].

If both are TN in every order, inserting a duplicate U column and the sum
V=RV+PV gives a three-branch Cauchy--Binet factorization of the complete
homotopy T_q(t).  This program exhausts every minor only for a finite range.
"""

from __future__ import annotations

import argparse
import json
from fractions import Fraction as F
from itertools import combinations
from math import comb
from pathlib import Path

from fast_bottom_forward import catalan, determinant, eye, matmul
from verify_newton_checker_offdiag_homotopy import beta_checker_inverse, jacobi_upper


OUT = Path("homotopy_interleaved_branches_20260803.json")


def audit(matrix):
    rows, columns = len(matrix), len(matrix[0])
    positive = zero = 0
    for size in range(1, min(rows, columns) + 1):
        for row_set in combinations(range(rows), size):
            for column_set in combinations(range(columns), size):
                value = determinant(
                    [[matrix[i][j] for j in column_set] for i in row_set]
                )
                assert value >= 0, (size, row_set, column_set, value)
                positive += value > 0
                zero += value == 0
    assert positive + zero == comb(rows + columns, rows) - 1
    return {"minors": positive + zero, "positive": positive, "zero": zero}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-q", type=int, default=7)
    args = parser.parse_args()
    records = []
    totals = {
        "left_minors": 0,
        "left_positive": 0,
        "left_zero": 0,
        "right_minors": 0,
        "right_positive": 0,
        "right_zero": 0,
    }
    for q in range(2, args.max_q + 1):
        u, v = jacobi_upper(q), beta_checker_inverse(q)
        r = [
            [F((-1) ** (j - i) * catalan(j - i + 1)) if j >= i else F(0) for j in range(q)]
            for i in range(q)
        ]
        identity = eye(q)
        p = [[identity[i][j] - r[i][j] for j in range(q)] for i in range(q)]
        up, rv, pv = matmul(u, p), matmul(r, v), matmul(p, v)
        left = [
            [value for s in range(q) for value in (up[i][s], u[i][s])]
            for i in range(q)
        ]
        right = [row for s in range(q) for row in (list(rv[s]), list(pv[s]))]
        left_result, right_result = audit(left), audit(right)
        for key, value in left_result.items():
            totals[f"left_{key}"] += value
        for key, value in right_result.items():
            totals[f"right_{key}"] += value
        records.append({"q": q, "left": left_result, "right": right_result})
        print(q, "PASS", left_result, right_result, flush=True)

    report = {
        "status": "PASS",
        "range": [2, args.max_q],
        **totals,
        "left": "interleave columns (UP)[:,s], U[:,s]",
        "right": "interleave rows (RV)[s,:], (PV)[s,:]",
        "R": "R[i,j]=(-1)^(j-i)*Catalan(j-i+1)",
        "P": "I-R",
        "scope": "Exact exhaustive finite evidence; the all-order TN lemmas remain to be proved.",
        "records": records,
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("PASS wrote", OUT)


if __name__ == "__main__":
    main()
