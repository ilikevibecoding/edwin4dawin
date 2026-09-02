#!/usr/bin/env python3
"""Verify the explicit Jacobi formula for the good upper smoothing factor.

If A_q is the checker-reversed inverse of the shifted Catalan Hankel
matrix, complete lower Neville elimination gives A_q=L_q U_q.  After a
positive row scaling, row i of U_q is the reversed coefficient vector of
the shifted Jacobi polynomial P_n^(1/2,5/2)(2t-1), n=q-1-i.  Explicitly,

  U_q[i,i+k]/U_q[i,i]
    = 4^k binom(n,k) (n+7/2-k)_k / (2n+4-k)_k.

The identity has an all-order hypergeometric derivation; this program is an
independent exact audit of the implementation and indexing.
"""

from __future__ import annotations

import argparse
import json
from math import comb
from pathlib import Path

from flint import fmpq, fmpq_mat

from stress_newton_full_quotient_flint import catalan


OUT = Path("newton_checker_jacobi_upper_20260803.json")


def checker_reversed_catalan_inverse(q: int):
    hankel = fmpq_mat(
        q,
        q,
        [catalan(i + j + 3) for i in range(q) for j in range(q)],
    )
    inverse = hankel.inv()
    return [
        [
            (-1 if (i + j) % 2 else 1)
            * inverse[q - 1 - i, q - 1 - j]
            for j in range(q)
        ]
        for i in range(q)
    ]


def upper_factor(matrix):
    work = [row[:] for row in matrix]
    q = len(work)
    for column in range(q - 1):
        for row in range(q - 1, column, -1):
            multiplier = work[row][column] / work[row - 1][column]
            assert multiplier > 0
            for j in range(column, q):
                work[row][j] -= multiplier * work[row - 1][j]
    assert all(work[i][j] == 0 for i in range(q) for j in range(i))
    return work


def predicted(n: int, k: int):
    value = fmpq(4**k * comb(n, k))
    for s in range(k):
        value *= fmpq(2 * (n - k + s) + 7, 2)
        value /= 2 * n + 4 - k + s
    return value


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-q", type=int, default=50)
    args = parser.parse_args()
    checks = 0
    records = []
    for q in range(2, args.max_q + 1):
        upper = upper_factor(checker_reversed_catalan_inverse(q))
        local = 0
        for i in range(q):
            n = q - 1 - i
            for k in range(n + 1):
                assert upper[i][i + k] / upper[i][i] == predicted(n, k)
                checks += 1
                local += 1
        records.append({"q": q, "formula_checks": local})
        print(f"q={q} PASS cumulative_checks={checks}", flush=True)
    report = {
        "status": "PASS",
        "range": [2, args.max_q],
        "formula_checks": checks,
        "formula": (
            "U[i,i+k]/U[i,i] = 4^k*binom(n,k)*"
            "(n+7/2-k)_k/(2n+4-k)_k, n=q-1-i"
        ),
        "interpretation": (
            "reversed coefficient triangle of shifted Jacobi "
            "P_n^(1/2,5/2)(2t-1), with t -> -1/(4z)"
        ),
        "scope": (
            "Finite exact audit.  The displayed identity itself follows "
            "for every n from the terminating 2F1 coefficient formula."
        ),
        "records": records,
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"PASS wrote {OUT}")


if __name__ == "__main__":
    main()
