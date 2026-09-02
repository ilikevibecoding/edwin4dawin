#!/usr/bin/env python3
"""All-order Delta2 certificate for center-rooted subdivided claws."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp

from probe_rank8_delta2_e1_symbolic_cell import claw_count, product_path_count
from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
DELTA2 = sp.Poly(sp.expand(newton_coefficients(residual())[2]), *c[4:9], h[6], h[7])
SOURCE_SYMBOLS = (*c[4:9], h[6], h[7])


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def evaluate_cell(arms: tuple[sp.Expr, sp.Expr, sp.Expr], variables: tuple[sp.Symbol, ...]) -> dict:
    raw = {
        **{c[k]: claw_count(arms, k) for k in range(4, 9)},
        **{h[k]: product_path_count(arms, k) for k in (6, 7)},
    }
    values = {symbol: sp.Poly(value, *variables) for symbol, value in raw.items()}
    result = sp.Poly(0, *variables)
    for powers, coefficient in DELTA2.terms():
        term = sp.Poly(coefficient, *variables)
        for symbol, power in zip(SOURCE_SYMBOLS, powers):
            if power:
                term *= values[symbol] ** power
        result += term
    coefficients = result.coeffs()
    negative = len([value for value in coefficients if value < 0])
    constant = result.coeff_monomial((0,) * len(variables))
    assert negative == 0
    assert min(coefficients) > 0
    assert constant > 0
    return {
        "arms": [str(arm) for arm in arms],
        "variables": [str(v) for v in variables],
        "degrees": [result.degree(v) for v in variables],
        "terms": len(result.terms()),
        "negative_coefficients": negative,
        "constant_coefficient": str(constant),
        "minimum_coefficient": str(min(coefficients)),
    }


def main() -> None:
    rows = []

    # Three long arms.
    A, B, C = sp.symbols("A B C", integer=True, nonnegative=True)
    row = evaluate_cell((A + 7, B + 7, C + 7), (A, B, C))
    row.update({"long_arms": 3, "coverage": "all three arms >=7"})
    rows.append(row)

    # Two long arms and one fixed short arm s.  From n>=23,
    # A+B>=8-s for long offsets A,B.  Hence max(A,B)>=ceil((8-s)/2);
    # permute the two long arms and shift that maximum.  The tested orthant is
    # a harmless over-cover because it drops the remaining sum constraint.
    for short in range(1, 7):
        threshold = math.ceil((8 - short) / 2)
        A, B = sp.symbols(f"A2_{short} B2_{short}", integer=True, nonnegative=True)
        row = evaluate_cell((A + 7 + threshold, B + 7, short), (A, B))
        row.update(
            {
                "long_arms": 2,
                "short_arms": [short],
                "coverage": f"n>=23 gives long-offset sum >= {8-short}; after permuting long arms, one offset >= {threshold}",
            }
        )
        rows.append(row)

    # One long arm and two fixed short arms.  The exact order constraint is a
    # one-variable lower shift A>=15-s-t.
    for short1 in range(1, 7):
        for short2 in range(short1, 7):
            threshold = 15 - short1 - short2
            assert threshold >= 3
            A = sp.symbols(f"A1_{short1}_{short2}", integer=True, nonnegative=True)
            row = evaluate_cell((A + 7 + threshold, short1, short2), (A,))
            row.update(
                {
                    "long_arms": 1,
                    "short_arms": [short1, short2],
                    "coverage": f"n>=23 iff long offset >= {threshold}",
                }
            )
            rows.append(row)

    assert len(rows) == 28
    assert all(row["negative_coefficients"] == 0 for row in rows)
    payload = {
        "schema": "rank8-delta2-e1-center-all-order-v1",
        "status": "PASS_EXACT_RANK8_DELTA2_E1_CENTER_ROOT_ALL_N23_PLUS",
        "scope": "Delta2>0 for the degree-3 center root of every subdivided claw of order n>=23",
        "short_long_split": "each positive arm is fixed in 1..6 or parameterized as X+7; zero-long cells have n<=19 and are irrelevant",
        "no_gap": {
            "three_long": 1,
            "two_long_one_short": 6,
            "one_long_two_short_unordered": 21,
            "zero_long": "impossible for n>=23",
            "total_symbolic_cells": 28,
        },
        "cells": rows,
        "conclusion": "Every coefficient in every shifted symbolic cell is strictly positive, so Delta2 is strictly positive on the complete center-rooted e=1 family for n>=23.",
    }
    output = HERE / "rank8_delta2_e1_center_all_order_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("cells", len(rows))
    print("minimum_cell_coefficient", min(row["minimum_coefficient"] for row in rows))
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
