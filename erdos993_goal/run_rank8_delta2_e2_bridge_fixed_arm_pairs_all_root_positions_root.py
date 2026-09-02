#!/usr/bin/env python3
"""Exact bridge-interior Delta2 cells for one pair of pendant-arm pair states."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import time
from pathlib import Path

import sympy as sp
from sympy.core.cache import clear_cache

from probe_rank8_delta2_e2_symmetric_long_cells import claw_from_pair, convolution, double_count
from run_rank8_delta2_e2_branch_short_long_cells import (
    pair_base, pair_states, pair_variable_count,
)
from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


ROOT = Path(__file__).resolve().parent
LONG = "L"
LENGTH_STATES = [1, 2, 3, 4, 5, 6, LONG]
GAP_STATES = [0, 1, 2, 3, 4, 5, LONG]
PAIR_TYPES = [
    (left, right)
    for index, left in enumerate(LENGTH_STATES)
    for right in LENGTH_STATES[index:]
]
SOURCE_SYMBOLS = (*c[4:9], h[6], h[7])
DELTA2 = sp.Poly(sp.expand(newton_coefficients(residual())[2]), *SOURCE_SYMBOLS)


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def parse_length(value: str):
    if value.upper() == LONG:
        return LONG
    parsed = int(value)
    if parsed not in range(1, 7):
        raise argparse.ArgumentTypeError("arm state must be 1..6 or L")
    return parsed


def state_index(value, states):
    return states.index(value)


def gap_base(state):
    return 6 if state == LONG else int(state)


def coordinate_names(left_pair, right_pair, left_gap, right_gap):
    names = []
    if pair_variable_count(left_pair):
        names.append("SL")
    if pair_variable_count(right_pair):
        names.append("SR")
    if left_gap == LONG:
        names.append("X")
    if right_gap == LONG:
        names.append("Y")
    return names


def build_states(left_pair, right_pair, left_gap_state, right_gap_state, shifted, shift):
    names = coordinate_names(left_pair, right_pair, left_gap_state, right_gap_state)
    symbols = {name: sp.symbols(name, nonnegative=True) for name in names}

    def coord(name):
        value = symbols.get(name)
        if value is None:
            return None
        return value + (shift if shifted == name else 0)

    left0, left1 = pair_states(left_pair, coord("SL"), 8)
    right0, right1 = pair_states(right_pair, coord("SR"), 8)
    left_gap = coord("X") + 6 if left_gap_state == LONG else sp.Integer(left_gap_state)
    right_gap = coord("Y") + 6 if right_gap_state == LONG else sp.Integer(right_gap_state)
    variables = tuple(symbols[name] for name in names)
    return variables, (left0, left1), (right0, right1), left_gap, right_gap


def evaluate_cell(left_pair, right_pair, left_gap_state, right_gap_state, shifted, shift):
    variables, left, right, left_gap, right_gap = build_states(
        left_pair, right_pair, left_gap_state, right_gap_state, shifted, shift
    )
    left0, left1 = left
    right0, right1 = right
    bridge = left_gap + right_gap + 2
    raw = {
        c[k]: double_count(
            left0[: k + 1], left1[: k + 1],
            right0[: k + 1], right1[: k + 1], bridge, k,
        )
        for k in range(4, 9)
    }
    for rank in (6, 7):
        left_claw = claw_from_pair(
            left0[: rank + 1], left1[: rank + 1], left_gap, rank
        )
        right_claw = claw_from_pair(
            right0[: rank + 1], right1[: rank + 1], right_gap, rank
        )
        raw[h[rank]] = convolution([left_claw, right_claw], rank)

    poly_variables = variables or (sp.symbols("_Z"),)
    values = {symbol: sp.Poly(value, *poly_variables) for symbol, value in raw.items()}
    result = sp.Poly(0, *poly_variables)
    for powers, coefficient in DELTA2.terms():
        term = sp.Poly(coefficient, *poly_variables)
        for symbol, power in zip(SOURCE_SYMBOLS, powers):
            if power:
                term *= values[symbol] ** power
        result += term
    coefficients = result.coeffs()
    return {
        "shifted_coordinate": shifted,
        "shift": shift,
        "variables": [str(value) for value in variables],
        "degrees": [result.degree(value) for value in variables],
        "terms": len(result.terms()),
        "negative_coefficients": len([value for value in coefficients if value < 0]),
        "minimum_coefficient": str(min(coefficients)),
        "constant_coefficient": str(
            result.coeff_monomial((0,) * len(poly_variables))
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--left-a", type=parse_length, required=True)
    parser.add_argument("--left-b", type=parse_length, required=True)
    parser.add_argument("--right-a", type=parse_length, required=True)
    parser.add_argument("--right-b", type=parse_length, required=True)
    args = parser.parse_args()
    left_pair = (args.left_a, args.left_b)
    right_pair = (args.right_a, args.right_b)
    if left_pair not in PAIR_TYPES or right_pair not in PAIR_TYPES:
        raise SystemExit("each arm pair must be supplied in symmetry order 1..6,L")
    if PAIR_TYPES.index(left_pair) > PAIR_TYPES.index(right_pair):
        raise SystemExit("left/right pair types must be supplied in canonical pair-type order")

    started = time.perf_counter()
    rows = []
    signed = []
    empty_patterns = 0
    stop = False
    gap_pairs = (
        [(left, right) for index, left in enumerate(GAP_STATES) for right in GAP_STATES[index:]]
        if left_pair == right_pair
        else [(left, right) for left in GAP_STATES for right in GAP_STATES]
    )
    for left_gap, right_gap in gap_pairs:
        names = coordinate_names(left_pair, right_pair, left_gap, right_gap)
        base = pair_base(left_pair) + pair_base(right_pair) + gap_base(left_gap) + gap_base(right_gap) + 2
        threshold = max(0, 22 - base)
        if threshold and not names:
            cover = None
            variants = []
            empty_patterns += 1
        elif threshold:
            cover = math.ceil(threshold / len(names))
            variants = [(name, cover) for name in names]
        else:
            cover = 0
            variants = [(None, 0)]
        cells = []
        for shifted, shift in variants:
            cell = evaluate_cell(
                left_pair, right_pair, left_gap, right_gap, shifted, shift
            )
            cells.append(cell)
            if (cell["negative_coefficients"]
                    or sp.Rational(cell["constant_coefficient"]) <= 0):
                signed.append({
                    "left_gap_state": left_gap,
                    "right_gap_state": right_gap,
                    "cell": cell,
                })
                stop = True
                break
        rows.append({
            "left_gap_state": left_gap,
            "right_gap_state": right_gap,
            "base_suppressed_length_sum": base,
            "order_constraint_on_offsets": threshold,
            "cover_coordinate_threshold": cover,
            "empty_by_order_constraint": bool(threshold and not names),
            "cells": cells,
        })
        clear_cache()
        print("progress_patterns", len(rows), "of", len(gap_pairs), flush=True)
        if stop:
            break

    total_cells = sum(len(row["cells"]) for row in rows)
    complete = len(rows) == len(gap_pairs) and not signed
    payload = {
        "schema": "rank8-delta2-e2-bridge-fixed-arm-pairs-all-root-positions-v1",
        "status": (
            "PASS_EXACT_RANK8_DELTA2_E2_BRIDGE_FIXED_ARM_PAIRS_ALL_ROOT_POSITIONS"
            if complete else "OBSTRUCTION_SIGNED_COEFFICIENT_CELL_FAIL_FAST"
        ),
        "left_arm_pair": list(left_pair),
        "right_arm_pair": list(right_pair),
        "scope": (
            "every bridge-interior root with the two unordered pendant-arm pair states fixed "
            "as stated, arbitrary positive central bridge/root position, and order n>=23"
        ),
        "gap_split": (
            "vertices strictly between the root and each branch are fixed 0..5 or long X+6"
        ),
        "side_symmetry": left_pair == right_pair,
        "patterns_expected": len(gap_pairs),
        "patterns_completed": len(rows),
        "empty_patterns": empty_patterns,
        "symbolic_cells_completed": total_cells,
        "signed_cells": signed,
        "runtime_seconds": time.perf_counter() - started,
        "cells": rows,
    }
    label = (
        f"left{left_pair[0]}_{left_pair[1]}_right{right_pair[0]}_{right_pair[1]}"
        .replace("L", "long")
    )
    output = ROOT / f"rank8_delta2_e2_bridge_{label}_all_root_positions_exact_root.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("patterns", len(rows), "cells", total_cells, "empty", empty_patterns, "signed", len(signed))
    print("runtime_seconds", payload["runtime_seconds"])
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
