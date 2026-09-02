#!/usr/bin/env python3
"""Probe the exact Borcea--Branden symbol of the row/column contraction.

The input space consists of two copies of a polynomial multiaffine in N row
variables and N labeled column variables.  The operator first performs d row
derivatives and evaluates all columns at one.  Its two correction terms tie
one distinguished row in each copy to one distinct column evaluation at zero;
the last term ties two rows to two columns in each copy.  Common-scale factors
are N and N(N-1).

If this algebraic symbol is stable, the desired contraction is a universal
multiaffine stability preserver.  An exact non-real-rooted positive-direction
line disproves that stronger route; clean tests are evidence only.
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
import random
from math import factorial
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
T = sp.symbols("T")


def derivative_sum(factors: list[sp.Expr], order: int) -> sp.Expr:
    """(sum partial)^order of a squarefree product after specialization."""
    if order < 0 or order > len(factors):
        return sp.S.Zero
    remaining = len(factors) - order
    return factorial(order) * sum(
        (sp.prod(factors[index] for index in subset) if subset else sp.S.One)
        for subset in itertools.combinations(range(len(factors)), remaining)
    )


def digest(poly: sp.Poly) -> str:
    _, integer = poly.clear_denoms(convert=True)
    _, primitive = integer.primitive()
    values = primitive.all_coeffs()
    if values and values[0] < 0:
        values = [-value for value in values]
    return hashlib.sha256(",".join(map(str, values)).encode("ascii")).hexdigest()


def random_affine(rng: random.Random) -> tuple[int, int, sp.Expr]:
    base = rng.randint(-30, 30)
    direction = rng.randint(1, 13)
    return base, direction, base + direction * T


def line_symbol(N: int, d: int, rng: random.Random) -> tuple[sp.Poly, dict[str, object]]:
    # The output diagonal variables and every input-dual variable independently
    # follow a real-base, strictly-positive-direction affine line.
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

    all_rows = row_a + row_b
    term0 = derivative_sum(all_rows, d)
    term0 *= sp.prod(1 + value for value in col_a)
    term0 *= sp.prod(1 + value for value in col_b)

    pair_terms = sp.S.Zero
    for endpoint in (0, N - 1):
        column = 0 if endpoint == 0 else 1
        remaining_rows = [
            value for index, value in enumerate(row_a) if index != endpoint
        ] + [
            value for index, value in enumerate(row_b) if index != endpoint
        ]
        column_a_factor = col_a[column] * sp.prod(
            1 + value for index, value in enumerate(col_a) if index != column
        )
        column_b_factor = col_b[column] * sp.prod(
            1 + value for index, value in enumerate(col_b) if index != column
        )
        pair_terms += (
            derivative_sum(remaining_rows, d - 2)
            * column_a_factor
            * column_b_factor
        )

    remaining_rows = row_a[1:-1] + row_b[1:-1]
    double_col_a = col_a[0] * col_a[1] * sp.prod(
        1 + value for index, value in enumerate(col_a) if index not in (0, 1)
    )
    double_col_b = col_b[0] * col_b[1] * sp.prod(
        1 + value for index, value in enumerate(col_b) if index not in (0, 1)
    )
    term2 = (
        derivative_sum(remaining_rows, d - 4)
        * double_col_a
        * double_col_b
    )

    expression = sp.expand(
        term0 - N * N * pair_terms + (N * (N - 1)) ** 2 * term2
    )
    line = sp.Poly(expression, T, domain=sp.QQ)
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
    parser.add_argument("--cells", default="4:5,5:5,6:6,7:6,7:7,10:9")
    parser.add_argument("--lines", type=int, default=40)
    parser.add_argument("--seed", type=int, default=993_829_20260804)
    parser.add_argument(
        "--out",
        type=Path,
        default=HERE / "row_column_contraction_algebraic_symbol_probe_20260804.json",
    )
    args = parser.parse_args()
    rng = random.Random(args.seed)
    cells = [tuple(map(int, cell.split(":"))) for cell in args.cells.split(",")]
    records: list[dict[str, object]] = []
    failure = None
    for N, d in cells:
        for line_index in range(args.lines):
            line, data = line_symbol(N, d, rng)
            real = int(line.count_roots(-sp.oo, sp.oo))
            record = {
                "N": N,
                "d": d,
                "line_index": line_index,
                "degree": line.degree(),
                "distinct_real_roots": real,
                "sha256": digest(line),
                **data,
            }
            records.append(record)
            if real != line.degree():
                failure = record
                print(f"({N},{d}) line={line_index}: FAIL {real}/{line.degree()}", flush=True)
                break
        if failure is not None:
            break
        print(f"({N},{d}): {args.lines} clean lines", flush=True)

    report = {
        "status": "EXACT_SYMBOL_OBSTRUCTION" if failure else "FINITE_EXACT_LINES_CLEAN",
        "cells": cells,
        "lines_checked": len(records),
        "first_failure": failure,
        "records": records,
        "scope": (
            "A failure disproves the universal multiaffine-preserver route. "
            "It does not disprove stability on the special Wishart image."
        ),
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.out)


if __name__ == "__main__":
    main()
