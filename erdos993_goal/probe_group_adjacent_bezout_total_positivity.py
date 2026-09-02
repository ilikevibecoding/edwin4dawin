"""Exact minor audit for total positivity of adjacent-layer Bezout matrices.

Positive definiteness already certifies the observed interlacing.  Total
positivity would be substantially stronger and could point to a planar
network factorization.  This script exhausts every square minor for the
small matrices in a configurable initial grid.  A failure disproves the
strong route; a clean finite run remains evidence only.
"""

from __future__ import annotations

import argparse
import itertools
import json
from pathlib import Path

from flint import fmpz_mat

from verify_group_adjacent_layer_bezout import bezout_matrix
from verify_group_general_homogeneous_layers import formula_row


HERE = Path(__file__).resolve().parent
REPORT = HERE / "group_adjacent_layer_bezout_tp_probe_20260804.json"


def minor(matrix: fmpz_mat, rows: tuple[int, ...], columns: tuple[int, ...]) -> int:
    size = len(rows)
    block = fmpz_mat(
        size,
        size,
        [int(matrix[i, j]) for i in rows for j in columns],
    )
    return int(block.det())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-d", type=int, default=9)
    parser.add_argument("--max-size", type=int, default=11)
    args = parser.parse_args()

    checks = []
    first_nonpositive = None
    total_minors = 0
    for d in range(5, args.max_d + 1):
        for r in range(1, d - 4):
            N = d + r
            for s in range(r):
                matrix = bezout_matrix(formula_row(N, d, s + 1), formula_row(N, d, s))
                if matrix.nrows() > args.max_size:
                    continue
                counts = {}
                for order in range(1, matrix.nrows() + 1):
                    positive = zero = negative = 0
                    subsets = list(itertools.combinations(range(matrix.nrows()), order))
                    for rows in subsets:
                        for columns in subsets:
                            value = minor(matrix, rows, columns)
                            if value > 0:
                                positive += 1
                            elif value == 0:
                                zero += 1
                                if first_nonpositive is None:
                                    first_nonpositive = {
                                        "N": N,
                                        "d": d,
                                        "r": r,
                                        "s_to_s_plus_1": s,
                                        "order": order,
                                        "rows": rows,
                                        "columns": columns,
                                        "determinant": "0",
                                    }
                            else:
                                negative += 1
                                if first_nonpositive is None:
                                    first_nonpositive = {
                                        "N": N,
                                        "d": d,
                                        "r": r,
                                        "s_to_s_plus_1": s,
                                        "order": order,
                                        "rows": rows,
                                        "columns": columns,
                                        "determinant": str(value),
                                    }
                    counts[str(order)] = {"positive": positive, "zero": zero, "negative": negative}
                    total_minors += positive + zero + negative
                checks.append(
                    {
                        "N": N,
                        "d": d,
                        "r": r,
                        "s_to_s_plus_1": s,
                        "size": matrix.nrows(),
                        "minor_counts": counts,
                    }
                )
                print(f"N={N} d={d} s={s} size={matrix.nrows()}", flush=True)

    report = {
        "status": "COUNTEREXAMPLE" if first_nonpositive else "PASS_PROBE_ONLY",
        "max_d": args.max_d,
        "max_size": args.max_size,
        "matrix_count": len(checks),
        "minor_count": total_minors,
        "first_nonpositive_minor": first_nonpositive,
        "checks": checks,
        "scope": "A negative minor rules out total nonnegativity.  A clean finite audit is not a proof.",
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: report[key] for key in ("status", "matrix_count", "minor_count", "first_nonpositive_minor")}, indent=2))
    print(REPORT)


if __name__ == "__main__":
    main()
