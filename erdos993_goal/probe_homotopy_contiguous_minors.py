#!/usr/bin/env python3
"""Search exact coefficient signs of every contiguous homotopy minor."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from verify_newton_checker_offdiag_homotopy import (
    constant_and_linear,
    poly,
)


def determinant(matrix):
    n = len(matrix)
    if n == 1:
        return matrix[0][0]
    work = [row[:] for row in matrix]
    previous = poly(1, 0)
    sign = 1
    for k in range(n - 1):
        pivot_row = next((i for i in range(k, n) if work[i][k] != 0), None)
        if pivot_row is None:
            return poly(0, 0)
        if pivot_row != k:
            work[k], work[pivot_row] = work[pivot_row], work[k]
            sign = -sign
        pivot = work[k][k]
        for i in range(k + 1, n):
            for j in range(k + 1, n):
                work[i][j] = (work[i][j] * pivot - work[i][k] * work[k][j]) / previous
        previous = pivot
    return sign * work[-1][-1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-q", type=int, default=12)
    args = parser.parse_args()
    records = []
    grand_checked = grand_positive = grand_zero = 0
    for q in range(2, args.max_q + 1):
        a, b = constant_and_linear(q)
        checked = positive = zero = 0
        for size in range(1, q + 1):
            for row0 in range(q - size + 1):
                for col0 in range(q - size + 1):
                    matrix = [
                        [poly(a[i][j], b[i][j]) for j in range(col0, col0 + size)]
                        for i in range(row0, row0 + size)
                    ]
                    determinant_value = determinant(matrix)
                    for degree in range(size + 1):
                        coefficient = determinant_value[degree]
                        if coefficient < 0:
                            print(
                                "FAIL",
                                q,
                                size,
                                row0,
                                col0,
                                degree,
                                coefficient,
                            )
                            return
                        positive += coefficient > 0
                        zero += coefficient == 0
                    checked += 1
        records.append(
            {
                "q": q,
                "contiguous_minors": checked,
                "positive_coefficients": positive,
                "zero_coefficients": zero,
            }
        )
        grand_checked += checked
        grand_positive += positive
        grand_zero += zero
        print(q, "PASS", checked, positive, zero, flush=True)
    report = {
        "status": "PASS",
        "range": [2, args.max_q],
        "contiguous_minors": grand_checked,
        "positive_coefficients": grand_positive,
        "zero_coefficients": grand_zero,
        "matrix": "T_q(t)=U_q^(J)*(diag(EZE)+t*offdiag(EZE))*Vbar_q",
        "scope": (
            "Exact finite evidence for coefficientwise positivity of all "
            "contiguous minors; it is not an all-order proof."
        ),
        "records": records,
    }
    output = Path("newton_checker_offdiag_contiguous_20260803.json")
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("PASS wrote", output)


if __name__ == "__main__":
    main()
