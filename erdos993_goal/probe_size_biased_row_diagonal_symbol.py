#!/usr/bin/env python3
"""Probe the six-variable diagonal of the symmetrized row symbol.

After averaging the four possible endpoint pairings, the algebraic symbol is
separately symmetric in the two endpoint-dual variables of each copy and in
the N-2 ordinary dual variables of each copy.  Grace--Walsh polarization
therefore reduces its stability to the diagonal polynomial below:

  P_X=(X+A)^2 (X+U)^(N-2),
  Q_X=D_X[X(X+A)(X+U)^(N-2)],
  R_X=D_X^2[X^2(X+U)^(N-2)],

  Z=S^d(P_XP_Y)-2S^(d-2)(Q_XQ_Y)+S^(d-4)(R_XR_Y).

Exact line failures disprove this proposed symbol theorem; clean finite lines
are evidence only.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
X, Y, A, B, U, V, T = sp.symbols("X Y A B U V T")
VARIABLES = (X, Y, A, B, U, V)


def S(expression: sp.Expr, order: int) -> sp.Expr:
    return sp.expand(sum(
        sp.binomial(order, split)
        * sp.diff(expression, X, split, Y, order - split)
        for split in range(order + 1)
    ))


def symbol(N: int, d: int) -> sp.Poly:
    n = N - 2
    px = (X + A) ** 2 * (X + U) ** n
    py = (Y + B) ** 2 * (Y + V) ** n
    qx = sp.diff(X * (X + A) * (X + U) ** n, X)
    qy = sp.diff(Y * (Y + B) * (Y + V) ** n, Y)
    rx = sp.diff(X**2 * (X + U) ** n, X, 2)
    ry = sp.diff(Y**2 * (Y + V) ** n, Y, 2)
    return sp.Poly(
        sp.expand(S(px * py, d) - 2 * S(qx * qy, d - 2) + S(rx * ry, d - 4)),
        *VARIABLES,
        domain=sp.QQ,
    )


def digest(poly: sp.Poly) -> str:
    _, integer = poly.clear_denoms(convert=True)
    _, primitive = integer.primitive()
    values = primitive.all_coeffs()
    if values and values[0] < 0:
        values = [-value for value in values]
    return hashlib.sha256(",".join(map(str, values)).encode("ascii")).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cells", default="4:5,5:5,6:6,7:6,7:7,10:9,13:11")
    parser.add_argument("--lines", type=int, default=100)
    parser.add_argument("--seed", type=int, default=993_853_20260804)
    parser.add_argument(
        "--out",
        type=Path,
        default=HERE / "size_biased_row_diagonal_symbol_probe_20260804.json",
    )
    args = parser.parse_args()
    rng = random.Random(args.seed)
    cells = [tuple(map(int, item.split(":"))) for item in args.cells.split(",")]
    records: list[dict[str, object]] = []
    failure = None
    for N, d in cells:
        polynomial = symbol(N, d)
        for line_index in range(args.lines):
            bases = [rng.randint(-50, 50) for _ in VARIABLES]
            directions = [rng.randint(1, 17) for _ in VARIABLES]
            line = sp.Poly(
                sp.expand(polynomial.as_expr().subs({
                    variable: base + direction * T
                    for variable, base, direction in zip(
                        VARIABLES, bases, directions, strict=True
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
        "status": "EXACT_DIAGONAL_SYMBOL_OBSTRUCTION" if failure else "FINITE_EXACT_LINES_CLEAN",
        "cells": cells,
        "lines_checked": len(records),
        "first_failure": failure,
        "records": records,
        "scope": (
            "By polarization, a stable diagonal proves the full separately "
            "symmetric algebraic symbol stable.  Finite line tests alone do "
            "not prove diagonal stability."
        ),
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.out)


if __name__ == "__main__":
    main()
