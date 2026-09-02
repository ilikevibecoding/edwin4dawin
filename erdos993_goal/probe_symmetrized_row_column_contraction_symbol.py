#!/usr/bin/env python3
"""Test the column-symmetrized row/column contraction symbol.

The Wishart lift is symmetric in its labeled Gaussian-column variables.  A
fixed-label obstruction therefore leaves open the stronger pre-averaged
operator.  This script replaces each fixed one-column factor by the sum over
all labels, and each fixed ordered two-column factor by the sum over all
ordered distinct labels, before testing the exact algebraic symbol.

An exact failed positive-direction line disproves this universal averaged
preserver.  It does not test the contraction on the special Wishart image.
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import sympy as sp

from probe_row_column_contraction_algebraic_symbol import (
    T,
    derivative_sum,
    digest,
    random_affine,
)


HERE = Path(__file__).resolve().parent


def one_column_symbol(columns: list[sp.Expr]) -> sp.Expr:
    return sp.expand(sum(
        columns[j] * sp.prod(
            1 + columns[k] for k in range(len(columns)) if k != j
        )
        for j in range(len(columns))
    ))


def two_column_symbol(columns: list[sp.Expr]) -> sp.Expr:
    n = len(columns)
    return sp.expand(sum(
        columns[j] * columns[k] * sp.prod(
            1 + columns[l] for l in range(n) if l not in (j, k)
        )
        for j in range(n)
        for k in range(n)
        if j != k
    ))


def line_symbol(
    N: int,
    d: int,
    rng: random.Random,
) -> tuple[sp.Poly, dict[str, object]]:
    base_x, dir_x, x = random_affine(rng)
    base_y, dir_y, y = random_affine(rng)
    row_a_data = [random_affine(rng) for _ in range(N)]
    row_b_data = [random_affine(rng) for _ in range(N)]
    col_a_data = [random_affine(rng) for _ in range(N)]
    col_b_data = [random_affine(rng) for _ in range(N)]
    row_a = [x + item[2] for item in row_a_data]
    row_b = [y + item[2] for item in row_b_data]
    col_a = [item[2] for item in col_a_data]
    col_b = [item[2] for item in col_b_data]

    expression = (
        derivative_sum(row_a + row_b, d)
        * sp.prod(1 + value for value in col_a)
        * sp.prod(1 + value for value in col_b)
    )
    one_a = one_column_symbol(col_a)
    one_b = one_column_symbol(col_b)
    for endpoint in (0, N - 1):
        remaining_rows = [
            value for index, value in enumerate(row_a) if index != endpoint
        ] + [
            value for index, value in enumerate(row_b) if index != endpoint
        ]
        expression -= derivative_sum(remaining_rows, d - 2) * one_a * one_b

    expression += (
        derivative_sum(row_a[1:-1] + row_b[1:-1], d - 4)
        * two_column_symbol(col_a)
        * two_column_symbol(col_b)
    )
    line = sp.Poly(sp.expand(expression), T, domain=sp.QQ)
    data = {
        "output": [[base_x, dir_x], [base_y, dir_y]],
        "row_a": [[item[0], item[1]] for item in row_a_data],
        "row_b": [[item[0], item[1]] for item in row_b_data],
        "col_a": [[item[0], item[1]] for item in col_a_data],
        "col_b": [[item[0], item[1]] for item in col_b_data],
    }
    return line, data


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--N", type=int, default=4)
    parser.add_argument("--d", type=int, default=5)
    parser.add_argument("--lines", type=int, default=40)
    parser.add_argument("--seed", type=int, default=993_829_20260804)
    parser.add_argument(
        "--out",
        type=Path,
        default=(
            HERE
            / "symmetrized_row_column_contraction_symbol_N4_probe_20260804.json"
        ),
    )
    args = parser.parse_args()
    rng = random.Random(args.seed)
    records: list[dict[str, object]] = []
    failure = None
    for line_index in range(args.lines):
        line, data = line_symbol(args.N, args.d, rng)
        real = int(line.count_roots(-sp.oo, sp.oo))
        record = {
            "line_index": line_index,
            "degree": line.degree(),
            "distinct_real_roots": real,
            "sha256": digest(line),
            **data,
        }
        records.append(record)
        if real != line.degree():
            failure = record
            print(
                f"line={line_index}: exact failure {real}/{line.degree()}",
                flush=True,
            )
            break

    report = {
        "status": (
            "EXACT_SYMMETRIZED_SYMBOL_OBSTRUCTION"
            if failure
            else "FINITE_EXACT_SYMMETRIZED_LINES_CLEAN"
        ),
        "N": args.N,
        "d": args.d,
        "lines_checked": len(records),
        "first_failure": failure,
        "records": records,
        "scope": (
            "The failure rules out the universal column-symmetrized "
            "algebraic-symbol route, not stability on the Wishart image."
        ),
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.out)


if __name__ == "__main__":
    main()
