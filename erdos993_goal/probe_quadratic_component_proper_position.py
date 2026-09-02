#!/usr/bin/env python3
"""Probe proper-position orientations among quadratic-kernel components.

The reversed-column coefficient matrix of M is totally nonnegative.  A
possible composition proof would also need the component polynomials

  C_(i,j)=B_N[t^i s^j L^(d-4)M]

to form compatible/proper-position chains in the same row and reversed-column
orders.  This script tests the necessary adjacent three-variable pencils by
exact Sturm counting.  A failure is rigorous; a clean screen is finite
evidence only.
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import sympy as sp

from fast_group_line_sturm_search import (
    affine_power,
    digest,
    exact_distinct_real_roots,
    restrict_line,
)
from probe_quadratic_kernel_monomial_components import (
    X,
    Y,
    component_polynomial,
    integer_matrix,
    seed_coefficients,
    s,
    t,
)


HERE = Path(__file__).resolve().parent


def pencil_test(
    left,
    right,
    trials: int,
    bound: int,
    rng: random.Random,
):
    for trial in range(trials):
        ax = rng.randint(-bound, bound)
        ay = rng.randint(-bound, bound)
        au = rng.randint(-bound, bound)
        bx = rng.randint(1, 31)
        by = rng.randint(1, 31)
        bu = rng.randint(1, 31)
        line = (
            restrict_line(left, ax, bx, ay, by)
            + affine_power(au, bu, 1) * restrict_line(right, ax, bx, ay, by)
        )
        real, gcd_degree, sturm_degrees = exact_distinct_real_roots(line)
        if real + gcd_degree != line.degree():
            return trial + 1, {
                "trial": trial,
                "line": [ax, bx, ay, by, au, bu],
                "degree": line.degree(),
                "distinct_real_roots": real,
                "gcd_degree": gcd_degree,
                "sturm_degrees": sturm_degrees,
                "sha256": digest(line),
            }
    return trials, None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cells", default="7:7,8:7,9:7")
    parser.add_argument("--trials", type=int, default=80)
    parser.add_argument("--bound", type=int, default=300)
    parser.add_argument("--seed", type=int, default=993_608_20260804)
    parser.add_argument(
        "--out",
        type=Path,
        default=HERE / "quadratic_component_proper_position_probe_20260804.json",
    )
    args = parser.parse_args()
    rng = random.Random(args.seed)

    a = t * (1 + t)
    b = s * (1 + s)
    L = a + b
    M = sp.Poly(sp.expand((1 + t) * (1 + s) * L**2 - t * s), t, s)
    support = {monomial for monomial, coefficient in M.terms() if coefficient}
    row_pairs = sorted(
        ((i, j), (i + 1, j))
        for i in range(5)
        for j in range(6)
        if (i, j) in support and (i + 1, j) in support
    )
    # Increasing column order after reversing the original j index.
    column_pairs = sorted(
        ((i, j), (i, j - 1))
        for i in range(6)
        for j in range(1, 6)
        if (i, j) in support and (i, j - 1) in support
    )
    pairs = [("row", left, right) for left, right in row_pairs] + [
        ("reversed_column", left, right) for left, right in column_pairs
    ]

    records = []
    for cell in args.cells.split(","):
        N, d = (int(value) for value in cell.split(":"))
        seeds_x = seed_coefficients(N, X, t)
        seeds_y = seed_coefficients(N, Y, s)
        matrices = {}
        for outer in support:
            polynomial = component_polynomial(N, d, outer, seeds_x, seeds_y)
            matrices[outer] = integer_matrix(polynomial, N + 1)
        for axis, left_index, right_index in pairs:
            orientations = []
            for label, first, second in (
                ("forward", left_index, right_index),
                ("reverse", right_index, left_index),
            ):
                tested, failure = pencil_test(
                    matrices[first],
                    matrices[second],
                    args.trials,
                    args.bound,
                    rng,
                )
                orientations.append({
                    "orientation": label,
                    "constant_component": list(first),
                    "marker_component": list(second),
                    "lines_tested": tested,
                    "status": "EXACT_LINE_FAILURE" if failure else "CLEAN_FINITE_EXACT_LINES",
                    "failure": failure,
                })
            record = {
                "N": N,
                "d": d,
                "axis": axis,
                "ordered_pair": [list(left_index), list(right_index)],
                "orientations": orientations,
            }
            records.append(record)
            print(
                f"N={N} d={d} {axis} {left_index}->{right_index}: "
                f"forward={orientations[0]['status']} "
                f"reverse={orientations[1]['status']}",
                flush=True,
            )

    forward_failures = sum(
        record["orientations"][0]["failure"] is not None for record in records
    )
    reverse_failures = sum(
        record["orientations"][1]["failure"] is not None for record in records
    )
    report = {
        "status": "PROBE_COMPLETE",
        "parameters": vars(args) | {"out": str(args.out)},
        "M_support_size": len(support),
        "row_adjacent_pairs": len(row_pairs),
        "reversed_column_adjacent_pairs": len(column_pairs),
        "pair_cell_checks": len(records),
        "forward_orientation_failures": forward_failures,
        "reverse_orientation_failures": reverse_failures,
        "records": records,
        "scope": (
            "Exact failures disprove the corresponding proper-position "
            "orientation.  Clean finite screens do not prove it."
        ),
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.out)


if __name__ == "__main__":
    main()
