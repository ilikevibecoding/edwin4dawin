#!/usr/bin/env python3
"""Exact short/long boundary cells for branch-rooted e=2 double claws."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import time
from functools import lru_cache
from pathlib import Path

import sympy as sp
from sympy.core.cache import clear_cache

from probe_rank8_delta2_e2_symmetric_long_cells import PAIR_P, PAIR_S, universal_pair_states
from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
LONG = "L"
PAIR_TYPES = [
    (left, right)
    for i, left in enumerate([1, 2, 3, 4, 5, 6, LONG])
    for right in [1, 2, 3, 4, 5, 6, LONG][i:]
]
BRIDGE_TYPES = [1, 2, 3, 4, 5, 6, 7, LONG]
SOURCE_SYMBOLS = (*c[4:9], h[6], h[7])
DELTA2 = sp.Poly(sp.expand(newton_coefficients(residual())[2]), *SOURCE_SYMBOLS)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def path_count(order: sp.Expr, rank: int) -> sp.Expr:
    if isinstance(order, (int, sp.Integer)):
        value = int(order)
        if value == -2:
            return sp.Integer(0)
        if value == -1:
            return sp.Integer(1 if rank == 0 else 0)
        if value < -2:
            raise ValueError(value)
        top = value - rank + 1
        return sp.Integer(math.comb(top, rank) if top >= rank >= 0 else 0)
    return sp.prod(order - rank + 1 - j for j in range(rank)) / sp.factorial(rank)


def path_vector(order: sp.Expr, rank: int) -> list[sp.Expr]:
    return [path_count(order, k) for k in range(rank + 1)]


def convolution(factors: list[list[sp.Expr]], rank: int) -> sp.Expr:
    values = [sp.Integer(1)] + [sp.Integer(0)] * rank
    for factor in factors:
        values = [sum(values[j] * factor[k - j] for j in range(k + 1)) for k in range(rank + 1)]
    return sp.expand(values[rank])


def direct_pair_states(arm1: sp.Expr, arm2: sp.Expr, rank: int):
    excluded = [convolution([path_vector(arm1, k), path_vector(arm2, k)], k) for k in range(rank + 1)]
    included = [sp.Integer(0)] + [
        convolution([path_vector(arm1 - 1, k), path_vector(arm2 - 1, k)], k)
        for k in range(rank)
    ]
    return excluded, included


def pair_variable_count(pair_type: tuple[int | str, int | str]) -> int:
    return int(LONG in pair_type)


def pair_base(pair_type: tuple[int | str, int | str]) -> int:
    return sum(7 if value == LONG else int(value) for value in pair_type)


def pair_states(pair_type, coordinate: sp.Expr | None, rank: int):
    long_count = pair_type.count(LONG)
    if long_count == 0:
        return direct_pair_states(int(pair_type[0]), int(pair_type[1]), rank)
    if long_count == 1:
        fixed = int(pair_type[0])
        return direct_pair_states(fixed, coordinate + 7, rank)
    excluded, included = universal_pair_states(rank)
    substitution = {PAIR_S: coordinate, PAIR_P: 0}
    return (
        [sp.expand(value.subs(substitution)) for value in excluded],
        [sp.expand(value.subs(substitution)) for value in included],
    )


def double_count(left0, left1, right0, right1, bridge, rank: int) -> sp.Expr:
    return sp.expand(
        convolution([left0, right0, path_vector(bridge - 1, rank)], rank)
        + convolution([left1, right0, path_vector(bridge - 2, rank)], rank)
        + convolution([left0, right1, path_vector(bridge - 2, rank)], rank)
        + convolution([left1, right1, path_vector(bridge - 3, rank)], rank)
    )


def claw_from_pair(pair0, pair1, third_arm, rank: int):
    return [
        sp.expand(
            convolution([pair0[: k + 1], path_vector(third_arm, k)], k)
            + convolution([pair1[: k + 1], path_vector(third_arm - 1, k)], k)
        )
        for k in range(rank + 1)
    ]


def evaluate_cell(root_pair_type, far_pair_type, bridge_type, shifted, shift):
    coordinate_symbols = {}
    if pair_variable_count(root_pair_type):
        coordinate_symbols["root_pair"] = sp.symbols("R", nonnegative=True)
    if pair_variable_count(far_pair_type):
        coordinate_symbols["far_pair"] = sp.symbols("F", nonnegative=True)
    if bridge_type == LONG:
        coordinate_symbols["bridge"] = sp.symbols("G", nonnegative=True)
    variables = tuple(coordinate_symbols.values())

    def coord(name):
        value = coordinate_symbols.get(name)
        if value is None:
            return None
        return value + (shift if shifted == name else 0)

    bridge = coord("bridge") + 8 if bridge_type == LONG else int(bridge_type)
    left0, left1 = pair_states(root_pair_type, coord("root_pair"), 8)
    right0, right1 = pair_states(far_pair_type, coord("far_pair"), 8)
    raw = {
        c[k]: double_count(
            left0[: k + 1], left1[: k + 1], right0[: k + 1], right1[: k + 1], bridge, k
        )
        for k in range(4, 9)
    }
    for rank in (6, 7):
        right_claw = claw_from_pair(right0[: rank + 1], right1[: rank + 1], bridge - 1, rank)
        raw[h[rank]] = convolution([left0[: rank + 1], right_claw], rank)

    if not variables:
        value = sp.factor(DELTA2.as_expr().subs(raw, simultaneous=True))
        return {
            "shifted_coordinate": None,
            "shift": 0,
            "variables": [],
            "degrees": [],
            "terms": 1,
            "negative_coefficients": 1 if value < 0 else 0,
            "minimum_coefficient": str(value),
            "constant_coefficient": str(value),
        }

    polys = {symbol: sp.Poly(value, *variables) for symbol, value in raw.items()}
    result = sp.Poly(0, *variables)
    for powers, coefficient in DELTA2.terms():
        term = sp.Poly(coefficient, *variables)
        for symbol, power in zip(SOURCE_SYMBOLS, powers):
            if power:
                term *= polys[symbol] ** power
        result += term
    coefficients = result.coeffs()
    negative = len([value for value in coefficients if value < 0])
    constant = result.coeff_monomial((0,) * len(variables))
    return {
        "shifted_coordinate": shifted,
        "shift": shift,
        "variables": [str(v) for v in variables],
        "degrees": [result.degree(v) for v in variables],
        "terms": len(result.terms()),
        "negative_coefficients": negative,
        "minimum_coefficient": str(min(coefficients)),
        "constant_coefficient": str(constant),
    }


def patterns(aggregate_long_count: int):
    for root_pair in PAIR_TYPES:
        for far_pair in PAIR_TYPES:
            for bridge in BRIDGE_TYPES:
                count = pair_variable_count(root_pair) + pair_variable_count(far_pair) + int(bridge == LONG)
                if count == aggregate_long_count:
                    yield root_pair, far_pair, bridge


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--aggregate-long-count", type=int, choices=(0, 1, 2, 3), required=True)
    args = parser.parse_args()
    started = time.perf_counter()
    rows = []
    irrelevant = 0
    for index, (root_pair, far_pair, bridge) in enumerate(patterns(args.aggregate_long_count), 1):
        base = pair_base(root_pair) + pair_base(far_pair) + (8 if bridge == LONG else int(bridge))
        threshold = max(0, 22 - base)
        coordinates = []
        if pair_variable_count(root_pair):
            coordinates.append("root_pair")
        if pair_variable_count(far_pair):
            coordinates.append("far_pair")
        if bridge == LONG:
            coordinates.append("bridge")
        if not coordinates and threshold > 0:
            irrelevant += 1
            continue
        if threshold == 0:
            variants = [(None, 0)]
            q = 0
        else:
            q = math.ceil(threshold / len(coordinates))
            variants = [(name, q) for name in coordinates]
        cells = [evaluate_cell(root_pair, far_pair, bridge, name, shift) for name, shift in variants]
        rows.append(
            {
                "root_pair": list(root_pair),
                "far_pair": list(far_pair),
                "bridge": bridge,
                "base_suppressed_length_sum": base,
                "order_constraint_on_offsets": threshold,
                "cover_coordinate_threshold": q,
                "cells": cells,
            }
        )
        clear_cache()
        if index % 10 == 0:
            print("progress_patterns", index, flush=True)

    signed = [
        {"root_pair": row["root_pair"], "far_pair": row["far_pair"], "bridge": row["bridge"], "cell": cell}
        for row in rows
        for cell in row["cells"]
        if cell["negative_coefficients"] or not sp.Rational(cell["constant_coefficient"]) > 0
    ]
    payload = {
        "schema": "rank8-delta2-e2-branch-short-long-cells-v1",
        "status": "PASS_POSITIVE_COEFFICIENT_CELLS" if not signed else "OBSTRUCTION_SIGNED_COEFFICIENT_CELLS",
        "scope": "branch-rooted e=2 cells at one aggregate-long count; not an all-order e=2 theorem",
        "aggregate_long_coordinate_count": args.aggregate_long_count,
        "pair_types": "unordered pair of fixed arm lengths 1..6 or L; LL uses the exact sum-only offset coordinate",
        "bridge_types": "fixed 1..7 or G+8",
        "order_guard": "n>=23 iff the five suppressed edge lengths sum to at least 22",
        "patterns_checked": len(rows),
        "irrelevant_fixed_patterns_below_n23": irrelevant,
        "symbolic_cells_checked": sum(len(row["cells"]) for row in rows),
        "signed_cell_count": len(signed),
        "signed_cells": signed,
        "runtime_seconds": time.perf_counter() - started,
        "patterns": rows,
    }
    output = HERE / f"rank8_delta2_e2_branch_short_long_{args.aggregate_long_count}coord_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n")
    print(payload["status"])
    print("patterns_checked", payload["patterns_checked"])
    print("symbolic_cells_checked", payload["symbolic_cells_checked"])
    print("signed_cell_count", payload["signed_cell_count"])
    print("runtime_seconds", payload["runtime_seconds"])
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
