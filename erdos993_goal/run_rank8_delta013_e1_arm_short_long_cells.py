#!/usr/bin/env python3
"""Exact symbolic short/long cells for Delta0/1/3 on arm-rooted subdivided claws."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import sympy as sp
from sympy.core.cache import clear_cache

from probe_rank8_delta2_e1_symbolic_cell import claw_count, path_count
from run_rank8_delta2_e1_arm_short_long_cells import (
    patterns_with_long_count,
    state_minimum,
)
from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
RANKS = (0, 1, 3)
SOURCE_SYMBOLS = (*c[3:9], h[6], h[7])
DELTA_TERMS = {
    rank: sp.Poly(
        sp.expand(newton_coefficients(residual())[rank]), *SOURCE_SYMBOLS
    ).terms()
    for rank in RANKS
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def symbolic_cell(
    pattern: tuple[int | str, int | str, int | str, int | str],
    shifted_coordinate: str | None,
    shift: int,
) -> dict:
    coordinate_names = ("near", "tail", "b", "c")
    variables = []
    values = []
    for name, state in zip(coordinate_names, pattern):
        if state == "L":
            variable = sp.symbols(f"x_{name}", integer=True, nonnegative=True)
            variables.append(variable)
            values.append(
                variable + 7 + (shift if name == shifted_coordinate else 0)
            )
        else:
            values.append(int(state))
    near, tail, other_b, other_c = values
    arms = (near + tail + 1, other_b, other_c)
    central_arms = (near, other_b, other_c)
    raw = {c[k]: claw_count(arms, k) for k in range(3, 9)}
    for coefficient_rank in (6, 7):
        central = [
            claw_count(central_arms, k) for k in range(coefficient_rank + 1)
        ]
        raw[h[coefficient_rank]] = sp.expand(
            sum(
                path_count(tail, j) * central[coefficient_rank - j]
                for j in range(coefficient_rank + 1)
            )
        )

    rank_rows = {}
    if not variables:
        substitutions = {
            symbol: sp.Integer(value) for symbol, value in raw.items()
        }
        for rank in RANKS:
            expression = sum(
                coefficient
                * sp.prod(
                    substitutions[symbol] ** power
                    for symbol, power in zip(SOURCE_SYMBOLS, powers)
                )
                for powers, coefficient in DELTA_TERMS[rank]
            )
            expression = sp.factor(expression)
            rank_rows[str(rank)] = {
                "degrees": [],
                "terms": 1,
                "negative_coefficients": int(bool(expression < 0)),
                "zero_coefficients": int(bool(expression == 0)),
                "minimum_coefficient": str(expression),
                "constant_coefficient": str(expression),
                "nonpositive_constant": int(bool(expression <= 0)),
            }
    else:
        variables_tuple = tuple(variables)
        polys = {
            symbol: sp.Poly(value, *variables_tuple)
            for symbol, value in raw.items()
        }
        for rank in RANKS:
            result = sp.Poly(0, *variables_tuple)
            for powers, coefficient in DELTA_TERMS[rank]:
                term = sp.Poly(coefficient, *variables_tuple)
                for symbol, power in zip(SOURCE_SYMBOLS, powers):
                    if power:
                        term *= polys[symbol] ** power
                result += term
            coefficients = result.coeffs()
            rank_rows[str(rank)] = {
                "degrees": list(result.degree_list()),
                "terms": len(result.terms()),
                "negative_coefficients": len(
                    [value for value in coefficients if value < 0]
                ),
                "zero_coefficients": len(
                    [value for value in coefficients if value == 0]
                ),
                "minimum_coefficient": str(min(coefficients)),
                "constant_coefficient": str(
                    result.coeff_monomial((0,) * len(variables_tuple))
                ),
            }
            rank_rows[str(rank)]["nonpositive_constant"] = int(
                bool(sp.Rational(rank_rows[str(rank)]["constant_coefficient"]) <= 0)
            )
    return {
        "shifted_coordinate": shifted_coordinate,
        "shift": shift,
        "variables": [str(v) for v in variables],
        "ranks": rank_rows,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--long-count", type=int, choices=(0, 1, 2, 3), required=True)
    args = parser.parse_args()
    rows = []
    irrelevant = 0
    for pattern in patterns_with_long_count(args.long_count):
        base_sum = sum(state_minimum(state) for state in pattern)
        threshold_sum = max(0, 21 - base_sum)
        long_coordinates = [
            name
            for name, state in zip(("near", "tail", "b", "c"), pattern)
            if state == "L"
        ]
        if not long_coordinates:
            if threshold_sum > 0:
                irrelevant += 1
                continue
            variants = [(None, 0)]
            cover_threshold = 0
        elif threshold_sum == 0:
            variants = [(None, 0)]
            cover_threshold = 0
        else:
            cover_threshold = math.ceil(threshold_sum / len(long_coordinates))
            representatives = [
                name
                for name in long_coordinates
                if name != "c" or "b" not in long_coordinates
            ]
            variants = [(name, cover_threshold) for name in representatives]

        cells = []
        for shifted_coordinate, shift in variants:
            cells.append(symbolic_cell(pattern, shifted_coordinate, shift))
            clear_cache()
        rows.append(
            {
                "pattern_near_tail_b_c": list(pattern),
                "base_segment_sum": base_sum,
                "order_constraint_on_long_offsets": threshold_sum,
                "cover_coordinate_threshold": cover_threshold,
                "cells": cells,
            }
        )
        print("PATTERN_DONE", pattern, len(cells), flush=True)

    bad_cells = []
    for row in rows:
        for cell in row["cells"]:
            for rank in RANKS:
                rank_row = cell["ranks"][str(rank)]
                if (
                    rank_row["negative_coefficients"]
                    or rank_row["zero_coefficients"]
                    or rank_row["nonpositive_constant"]
                ):
                    bad_cells.append(
                        {
                            "rank": rank,
                            "pattern": row["pattern_near_tail_b_c"],
                            "cell": cell,
                        }
                    )
    payload = {
        "schema": "rank8-delta013-e1-arm-short-long-cells-v1",
        "status": (
            "PASS_EXACT_POSITIVE_COEFFICIENT_CELLS"
            if not bad_cells
            else "OBSTRUCTION_SIGNED_COEFFICIENT_CELLS"
        ),
        "ranks": list(RANKS),
        "long_segment_count": args.long_count,
        "segment_convention": "near,tail are fixed 0..6 or X+7; other arms b<=c are fixed 1..6 or X+7",
        "order_guard": "n=near+tail+b+c+2>=23 iff segment sum>=21",
        "cover_guard": "if long-offset sum>=T>0, some long offset>=ceil(T/m); shift each nonsymmetric long-coordinate representative, with b/c permutation symmetry",
        "patterns_checked": len(rows),
        "irrelevant_fixed_patterns_below_n23": irrelevant,
        "symbolic_cells_checked": sum(len(row["cells"]) for row in rows),
        "bad_rank_cell_count": len(bad_cells),
        "bad_cells": bad_cells,
        "patterns": rows,
        "warning": "A signed power-basis cell is a method obstruction only, not a negative value or tree counterexample.",
    }
    output = HERE / (
        f"rank8_delta013_e1_arm_short_long_{args.long_count}long_exact_20260820.json"
    )
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("patterns_checked", payload["patterns_checked"])
    print("symbolic_cells_checked", payload["symbolic_cells_checked"])
    print("bad_rank_cell_count", payload["bad_rank_cell_count"])
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
