"""Exact total-nonnegativity audit for the group coefficient triangle.

For fixed (N,d), arrange the coefficient diagonals of G_(N,d) in increasing
total degree.  Row t and column a contain [X^a Y^(t-a)]G, with zeros outside
the support.  Initial calculations suggest that this rectangular triangle is
totally nonnegative.  This script exhausts all square minors for small cases
and bounded orders for larger cases.  A clean run is discovery evidence only.
"""

from __future__ import annotations

import argparse
import itertools
import json
from pathlib import Path

from flint import fmpz_mat

from probe_group_order6_sturm import group_matrix


HERE = Path(__file__).resolve().parent
REPORT = HERE / "group_coefficient_triangle_tn_probe_20260804.json"


def coefficient_triangle(N: int, d: int) -> fmpz_mat:
    matrix = group_matrix(N, d)
    maximum_degree = 2 * N - d
    rows = []
    for total_degree in range(maximum_degree + 1):
        rows.append(
            [
                int(matrix[a, total_degree - a])
                if 0 <= total_degree - a < matrix.ncols()
                else 0
                for a in range(N + 1)
            ]
        )
    return fmpz_mat(
        len(rows), N + 1, [entry for row in rows for entry in row]
    )


def subdeterminant(matrix: fmpz_mat, rows, columns) -> int:
    size = len(rows)
    return int(
        fmpz_mat(
            size,
            size,
            [int(matrix[i, j]) for i in rows for j in columns],
        ).det()
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-n", type=int, default=10)
    parser.add_argument("--max-order", type=int, default=99)
    parser.add_argument("--report-name", default=REPORT.name)
    args = parser.parse_args()

    checks = []
    total_minors = 0
    first_negative = None
    for d in range(5, args.max_n + 1):
        for r in range(0, min(d - 5, args.max_n - d) + 1):
            N = d + r
            matrix = coefficient_triangle(N, d)
            counts = {}
            limit = min(matrix.nrows(), matrix.ncols(), args.max_order)
            for order in range(1, limit + 1):
                positive = zero = negative = 0
                for rows in itertools.combinations(range(matrix.nrows()), order):
                    for columns in itertools.combinations(range(matrix.ncols()), order):
                        value = subdeterminant(matrix, rows, columns)
                        if value > 0:
                            positive += 1
                        elif value == 0:
                            zero += 1
                        else:
                            negative += 1
                            if first_negative is None:
                                first_negative = {
                                    "N": N,
                                    "d": d,
                                    "order": order,
                                    "rows": rows,
                                    "columns": columns,
                                    "determinant": str(value),
                                }
                counts[str(order)] = {
                    "positive": positive,
                    "zero": zero,
                    "negative": negative,
                }
                total_minors += positive + zero + negative
                if negative:
                    break
            checks.append(
                {
                    "N": N,
                    "d": d,
                    "shape": [matrix.nrows(), matrix.ncols()],
                    "counts": counts,
                }
            )
            print(f"N={N} d={d} shape={matrix.nrows()}x{matrix.ncols()} counts={counts}", flush=True)
            if first_negative is not None:
                break
        if first_negative is not None:
            break

    report = {
        "status": "COUNTEREXAMPLE" if first_negative else "PASS_PROBE_ONLY",
        "total_minors": total_minors,
        "first_negative": first_negative,
        "checks": checks,
        "scope": (
            "All recorded determinants are exact integers.  Finite total "
            "nonnegativity does not prove an all-order planar-network formula."
        ),
    }
    report_path = HERE / args.report_name
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "total_minors": total_minors,
        "first_negative": first_negative,
        "report": str(report_path),
    }, indent=2))


if __name__ == "__main__":
    main()
