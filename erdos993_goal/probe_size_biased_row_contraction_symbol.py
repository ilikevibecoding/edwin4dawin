#!/usr/bin/env python3
"""Probe the size-biased row-only contraction symbol.

The homogeneous row/column lift obeys E_x+E_c=N.  Consequently a one-column
omission equals E_x on the lift, and two ordered column omissions equal
E_x(E_x-1).  After the columns are specialized to one, the endpoint states
can therefore be written using only the stable row polynomial P_A:

  Q_e = partial_e E_x P_A,
  R_ef = partial_e partial_f E_x(E_x-1) P_A.

This script tests the exact finite-degree algebraic symbol of the resulting
two-copy Weyl operator after row diagonalization.  A failed positive-direction
line rules out a universal row-stability-preserver theorem; clean lines are
evidence only.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
X, Y, T = sp.symbols("X Y T")


def S(expression: sp.Expr, order: int) -> sp.Expr:
    if order < 0:
        return sp.S.Zero
    return sp.expand(sum(
        sp.binomial(order, split)
        * sp.diff(expression, X, split, Y, order - split)
        for split in range(order + 1)
    ))


def euler_shift(expression: sp.Expr, variable: sp.Symbol, shifts: tuple[int, ...]) -> sp.Expr:
    answer = expression
    for shift in shifts:
        answer = sp.expand(variable * sp.diff(answer, variable) + shift * answer)
    return answer


def row_symbol(
    N: int,
    d: int,
    ua: tuple[sp.Symbol, ...],
    ub: tuple[sp.Symbol, ...],
    symmetrized: bool = False,
) -> sp.Expr:
    base_a = sp.prod(X + value for value in ua)
    base_b = sp.prod(Y + value for value in ub)
    term0 = S(base_a * base_b, d)

    qa_values = []
    qb_values = []
    for endpoint in (0, N - 1):
        qa = sp.prod(X + ua[index] for index in range(N) if index != endpoint)
        qb = sp.prod(Y + ub[index] for index in range(N) if index != endpoint)
        qa = euler_shift(qa, X, (1,))
        qb = euler_shift(qb, Y, (1,))
        qa_values.append(qa)
        qb_values.append(qb)

    if symmetrized:
        pair = sp.Rational(1, 2) * S(
            (qa_values[0] + qa_values[1])
            * (qb_values[0] + qb_values[1]),
            d - 2,
        )
    else:
        pair = sum(
            (S(qa * qb, d - 2) for qa, qb in zip(qa_values, qb_values)),
            sp.S.Zero,
        )

    ra = sp.prod(X + ua[index] for index in range(N) if index not in (0, N - 1))
    rb = sp.prod(Y + ub[index] for index in range(N) if index not in (0, N - 1))
    ra = euler_shift(ra, X, (1, 2))
    rb = euler_shift(rb, Y, (1, 2))
    term2 = S(ra * rb, d - 4)
    return sp.expand(term0 - pair + term2)


def digest(poly: sp.Poly) -> str:
    _, integer = poly.clear_denoms(convert=True)
    _, primitive = integer.primitive()
    values = primitive.all_coeffs()
    if values and values[0] < 0:
        values = [-value for value in values]
    return hashlib.sha256(",".join(map(str, values)).encode("ascii")).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cells", default="4:5,5:5,6:6,7:6,7:7,10:9")
    parser.add_argument("--lines", type=int, default=50)
    parser.add_argument("--seed", type=int, default=993_841_20260804)
    parser.add_argument(
        "--symmetrized",
        action="store_true",
        help=(
            "average all four endpoint pairings in the middle term; this "
            "agrees with the target when the two endpoint states coincide"
        ),
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=HERE / "size_biased_row_contraction_symbol_probe_20260804.json",
    )
    args = parser.parse_args()
    rng = random.Random(args.seed)
    cells = [tuple(map(int, item.split(":"))) for item in args.cells.split(",")]
    records: list[dict[str, object]] = []
    failure = None

    for N, d in cells:
        ua = sp.symbols(f"u0:{N}")
        ub = sp.symbols(f"v0:{N}")
        symbol = row_symbol(N, d, ua, ub, symmetrized=args.symmetrized)
        variables = (X, Y, *ua, *ub)
        for line_index in range(args.lines):
            bases = [rng.randint(-30, 30) for _ in variables]
            directions = [rng.randint(1, 13) for _ in variables]
            line = sp.Poly(
                sp.expand(symbol.subs({
                    variable: base + direction * T
                    for variable, base, direction in zip(
                        variables, bases, directions, strict=True
                    )
                })),
                T,
                domain=sp.QQ,
            )
            real = int(line.count_roots(-sp.oo, sp.oo))
            record = {
                "N": N,
                "d": d,
                "line_index": line_index,
                "bases": bases,
                "directions": directions,
                "degree": line.degree(),
                "distinct_real_roots": real,
                "sha256": digest(line),
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
        "symmetrized": args.symmetrized,
        "lines_checked": len(records),
        "first_failure": failure,
        "records": records,
        "scope": (
            "A failure disproves universal preservation on row-multiaffine "
            "stable inputs; it does not disprove the special Wishart image."
        ),
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.out)


if __name__ == "__main__":
    main()
