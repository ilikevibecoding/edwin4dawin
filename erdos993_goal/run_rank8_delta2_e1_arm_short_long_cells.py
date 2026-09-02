#!/usr/bin/env python3
"""Exact symbolic short/long cells for arm-rooted subdivided claws."""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
import math
from pathlib import Path

import sympy as sp
from sympy.core.cache import clear_cache

from probe_rank8_delta2_e1_symbolic_cell import claw_count, path_count
from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
SOURCE_SYMBOLS = (*c[4:9], h[6], h[7])
DELTA2 = sp.Poly(sp.expand(newton_coefficients(residual())[2]), *SOURCE_SYMBOLS)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def state_minimum(state: int | str) -> int:
    return 7 if state == "L" else int(state)


def pattern_key(pattern: tuple[int | str, ...]) -> str:
    return "_".join(map(str, pattern))


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
            values.append(variable + 7 + (shift if name == shifted_coordinate else 0))
        else:
            values.append(int(state))
    near, tail, other_b, other_c = values
    arms = (near + tail + 1, other_b, other_c)
    central_arms = (near, other_b, other_c)
    raw = {c[k]: claw_count(arms, k) for k in range(4, 9)}
    for rank in (6, 7):
        central = [claw_count(central_arms, k) for k in range(rank + 1)]
        raw[h[rank]] = sp.expand(
            sum(path_count(tail, j) * central[rank - j] for j in range(rank + 1))
        )

    if not variables:
        substitutions = {symbol: sp.Integer(value) for symbol, value in raw.items()}
        exact = sp.factor(DELTA2.as_expr().subs(substitutions, simultaneous=True))
        assert exact > 0
        return {
            "shifted_coordinate": None,
            "shift": 0,
            "variables": [],
            "degrees": [],
            "terms": 1,
            "negative_coefficients": 1 if exact < 0 else 0,
            "minimum_coefficient": str(exact),
            "constant_coefficient": str(exact),
        }

    variables_tuple = tuple(variables)
    polys = {symbol: sp.Poly(value, *variables_tuple) for symbol, value in raw.items()}
    result = sp.Poly(0, *variables_tuple)
    for powers, coefficient in DELTA2.terms():
        term = sp.Poly(coefficient, *variables_tuple)
        for symbol, power in zip(SOURCE_SYMBOLS, powers):
            if power:
                term *= polys[symbol] ** power
        result += term
    coefficients = result.coeffs()
    negative = len([value for value in coefficients if value < 0])
    constant = result.coeff_monomial((0,) * len(variables_tuple))
    assert negative == 0
    assert min(coefficients) > 0
    assert constant > 0
    return {
        "shifted_coordinate": shifted_coordinate,
        "shift": shift,
        "variables": [str(v) for v in variables_tuple],
        "degrees": [result.degree(v) for v in variables_tuple],
        "terms": len(result.terms()),
        "negative_coefficients": negative,
        "minimum_coefficient": str(min(coefficients)),
        "constant_coefficient": str(constant),
    }


def patterns_with_long_count(long_count: int):
    near_states = [*range(0, 7), "L"]
    tail_states = [*range(0, 7), "L"]
    other_states = [*range(1, 7), "L"]
    for near in near_states:
        for tail in tail_states:
            for index_b, b in enumerate(other_states):
                for cc in other_states[index_b:]:
                    pattern = (near, tail, b, cc)
                    if pattern.count("L") == long_count:
                        yield pattern


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--long-count", type=int, choices=(0, 1, 2, 3, 4), required=True)
    args = parser.parse_args()
    rows = []
    irrelevant = 0
    for pattern in patterns_with_long_count(args.long_count):
        base_sum = sum(state_minimum(state) for state in pattern)
        threshold_sum = max(0, 21 - base_sum)
        long_coordinates = [name for name, state in zip(("near", "tail", "b", "c"), pattern) if state == "L"]
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
            # If both other arms are long, b/c symmetry means shifting b covers
            # the case in which c is the large coordinate after permuting them.
            representatives = [name for name in long_coordinates if name != "c" or "b" not in long_coordinates]
            variants = [(name, cover_threshold) for name in representatives]

        cells = []
        for shifted_coordinate, shift in variants:
            cell = symbolic_cell(pattern, shifted_coordinate, shift)
            cells.append(cell)
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

    negative_cells = [
        {"pattern": row["pattern_near_tail_b_c"], "cell": cell}
        for row in rows
        for cell in row["cells"]
        if cell["negative_coefficients"]
    ]
    payload = {
        "schema": "rank8-delta2-e1-arm-short-long-cells-v1",
        "status": "PASS_POSITIVE_COEFFICIENT_CELLS" if not negative_cells else "OBSTRUCTION_SIGNED_COEFFICIENT_CELLS",
        "long_segment_count": args.long_count,
        "segment_convention": "near,tail are fixed 0..6 or X+7; other arms b<=c are fixed 1..6 or X+7",
        "order_guard": "n=near+tail+b+c+2>=23 iff segment sum>=21",
        "cover_guard": "if long-offset sum>=T>0, some long offset>=ceil(T/m); shift each nonsymmetric long-coordinate representative, with b/c permutation symmetry",
        "patterns_checked": len(rows),
        "irrelevant_fixed_patterns_below_n23": irrelevant,
        "symbolic_cells_checked": sum(len(row["cells"]) for row in rows),
        "negative_cell_count": len(negative_cells),
        "negative_cells": negative_cells,
        "patterns": rows,
    }
    output = HERE / f"rank8_delta2_e1_arm_short_long_{args.long_count}long_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("long_segment_count", args.long_count)
    print("patterns_checked", payload["patterns_checked"])
    print("symbolic_cells_checked", payload["symbolic_cells_checked"])
    print("negative_cell_count", payload["negative_cell_count"])
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
