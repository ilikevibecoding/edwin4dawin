#!/usr/bin/env python3
"""Exact gamma=0 endpoint check for every solid Bezout minor.

The polynomial audits prove coefficientwise nonnegativity away from a small
mixed-sign southeast family.  This replay checks the missing endpoint of the
parameter axis directly: every solid minor, and hence every initial minor,
has a strictly positive constant term.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp
from flint import fmpq

from probe_equal_direction_bezout_certificate import bezout_matrix, gamma, t
from verify_quadratic_component_square_root_lowering import X, Y, group


HERE = Path(__file__).resolve().parent


def to_fmpq(value: sp.Expr) -> fmpq:
    rational = sp.Rational(value)
    return fmpq(int(rational.p), int(rational.q))


def audit(N: int, d: int) -> dict[str, object]:
    q = sp.Poly(sp.expand(group(N, d).subs({X: t + gamma, Y: t})), t)
    symbolic = bezout_matrix(q)
    n = q.degree()
    levels: dict[int, list[list[fmpq]]] = {
        1: [
            [to_fmpq(symbolic[row, column].subs(gamma, 0)) for column in range(n)]
            for row in range(n)
        ]
    }
    solid = initial = positive_solid = positive_initial = 0
    aggregate = hashlib.sha256()
    first_failure = None

    for order in range(1, n + 1):
        if order >= 2:
            side = n - order + 1
            previous = levels[order - 1]
            older = levels.get(order - 2)
            current: list[list[fmpq]] = []
            for row in range(side):
                current_row: list[fmpq] = []
                for column in range(side):
                    numerator = (
                        previous[row][column] * previous[row + 1][column + 1]
                        - previous[row + 1][column] * previous[row][column + 1]
                    )
                    denominator = (
                        fmpq(1) if order == 2 else older[row + 1][column + 1]
                    )
                    current_row.append(numerator / denominator)
                current.append(current_row)
            levels[order] = current
            if order >= 3:
                del levels[order - 2]

        for row, values in enumerate(levels[order]):
            for column, minor in enumerate(values):
                solid += 1
                is_initial = row == 0 or column == 0
                initial += int(is_initial)
                positive_solid += int(minor > 0)
                positive_initial += int(is_initial and minor > 0)
                aggregate.update(f"{minor.p}/{minor.q}|".encode("ascii"))
                if minor <= 0 and first_failure is None:
                    first_failure = {
                        "order": order,
                        "row": row,
                        "column": column,
                        "value": str(minor),
                    }

    print(
        f"(N,d)=({N},{d}) positive solid={positive_solid}/{solid} "
        f"initial={positive_initial}/{initial}",
        flush=True,
    )
    return {
        "N": N,
        "d": d,
        "matrix_size": n,
        "positive_solid_constants": positive_solid,
        "solid_minors": solid,
        "positive_initial_constants": positive_initial,
        "initial_minors": initial,
        "first_failure": first_failure,
        "aggregate_sha256": aggregate.hexdigest(),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--pairs",
        default="4:5,7:7,10:9,13:11,16:13,19:15,22:17,25:19,28:21",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=HERE / "equal_direction_bezout_solid_constants_nine_20260804.json",
    )
    args = parser.parse_args()
    pairs = [tuple(map(int, item.split(":"))) for item in args.pairs.split(",")]
    records = [audit(N, d) for N, d in pairs]
    assert all(record["first_failure"] is None for record in records)
    report = {
        "status": "EXACT_POSITIVE_SOLID_CONSTANT_CERTIFICATE",
        "parameter": "gamma=0",
        "records": records,
        "totals": {
            "solid_minors": sum(record["solid_minors"] for record in records),
            "initial_minors": sum(record["initial_minors"] for record in records),
        },
        "scope": "Exact finite endpoint certificate; not an all-order proof.",
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.output, flush=True)


if __name__ == "__main__":
    main()
