#!/usr/bin/env python3
"""Exact pendant-root boundary cells for one far-pair/paired-arm state.

The bridge is >=8.  The selected arm and root position are arbitrary.  Far
arms are unordered by branch symmetry.  The n>=23 condition is covered by a
finite union of shifted coordinate orthants.  The runner stops at the first
signed polynomial cell.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import time
from pathlib import Path

import sympy as sp
from sympy.core.cache import clear_cache

from probe_rank8_delta2_e2_symmetric_long_cells import pair_states
from run_rank8_delta2_e2_branch_short_long_cells import (
    convolution, direct_pair_states, double_count, path_vector,
)
from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
LONG = "L"
ROOT_STATES = [0, 1, 2, 3, 4, 5, 6, LONG]
LENGTH_STATES = [1, 2, 3, 4, 5, 6, LONG]
SOURCE_SYMBOLS = (*c[4:9], h[6], h[7])
DELTA2 = sp.Poly(sp.expand(newton_coefficients(residual())[2]), *SOURCE_SYMBOLS)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def parse_state(value: str):
    if value.upper() == LONG:
        return LONG
    result = int(value)
    if result not in range(1, 7):
        raise argparse.ArgumentTypeError("length state must be 1..6 or L")
    return result


def base_value(state, long_base: int) -> int:
    return long_base if state == LONG else int(state)


def coordinate_names(paired_state, near_state, tail_state, far_pair):
    names = []
    if paired_state == LONG and near_state == LONG:
        names.append("X")
    else:
        if paired_state == LONG:
            names.append("B")
        if near_state == LONG:
            names.append("N")
    if tail_state == LONG:
        names.append("U")
    if LONG in far_pair:
        names.append("F")
    names.append("G")
    return names


def build_states(paired_state, near_state, tail_state, far_pair, shifted, shift):
    names = coordinate_names(paired_state, near_state, tail_state, far_pair)
    symbols = {name: sp.symbols(name, nonnegative=True) for name in names}

    def coord(name):
        value = symbols[name]
        return value + shift if shifted == name else value

    if paired_state == LONG:
        if near_state == LONG:
            X = coord("X")
            deletion_left = pair_states(X, sp.Integer(0), 8)
            if tail_state == LONG:
                U = coord("U")
                tail = U + 7
                core_left = pair_states(X + U + 8, sp.Integer(0), 8)
            else:
                tail = sp.Integer(tail_state)
                core_left = pair_states(X + tail + 1, sp.Integer(0), 8)
        else:
            near = sp.Integer(near_state)
            B = coord("B")
            deletion_left = direct_pair_states(near, B + 7, 8)
            if tail_state == LONG:
                U = coord("U")
                tail = U + 7
                core_left = pair_states(B + U + near + 1, sp.Integer(0), 8)
            else:
                tail = sp.Integer(tail_state)
                core_left = direct_pair_states(near + tail + 1, B + 7, 8)
    else:
        paired = int(paired_state)
        near = coord("N") + 7 if near_state == LONG else sp.Integer(near_state)
        tail = coord("U") + 7 if tail_state == LONG else sp.Integer(tail_state)
        core_left = direct_pair_states(near + tail + 1, paired, 8)
        deletion_left = direct_pair_states(near, paired, 8)

    long_count = far_pair.count(LONG)
    if long_count == 0:
        right = direct_pair_states(int(far_pair[0]), int(far_pair[1]), 8)
    elif long_count == 1:
        fixed = int(far_pair[0]) if far_pair[0] != LONG else int(far_pair[1])
        right = direct_pair_states(fixed, coord("F") + 7, 8)
    else:
        right = pair_states(coord("F"), sp.Integer(0), 8)
    bridge = coord("G") + 8
    variables = tuple(symbols[name] for name in names)
    return variables, core_left, deletion_left, right, bridge, tail


def evaluate_cell(paired_state, near_state, tail_state, far_pair, shifted, shift):
    variables, core_left, deletion_left, right, bridge, tail = build_states(
        paired_state, near_state, tail_state, far_pair, shifted, shift
    )
    core_left0, core_left1 = core_left
    deletion_left0, deletion_left1 = deletion_left
    right0, right1 = right
    raw = {
        c[k]: double_count(
            core_left0[: k + 1], core_left1[: k + 1],
            right0[: k + 1], right1[: k + 1], bridge, k
        )
        for k in range(4, 9)
    }
    for rank in (6, 7):
        central = [
            double_count(
                deletion_left0[: k + 1], deletion_left1[: k + 1],
                right0[: k + 1], right1[: k + 1], bridge, k
            )
            for k in range(rank + 1)
        ]
        raw[h[rank]] = convolution([path_vector(tail, rank), central], rank)

    values = {symbol: sp.Poly(value, *variables) for symbol, value in raw.items()}
    result = sp.Poly(0, *variables)
    for powers, coefficient in DELTA2.terms():
        term = sp.Poly(coefficient, *variables)
        for symbol, power in zip(SOURCE_SYMBOLS, powers):
            if power:
                term *= values[symbol] ** power
        result += term
    coefficients = result.coeffs()
    return {
        "shifted_coordinate": shifted,
        "shift": shift,
        "variables": [str(v) for v in variables],
        "degrees": [result.degree(v) for v in variables],
        "terms": len(result.terms()),
        "negative_coefficients": len([value for value in coefficients if value < 0]),
        "minimum_coefficient": str(min(coefficients)),
        "constant_coefficient": str(result.coeff_monomial((0,) * len(variables))),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--far-left", type=parse_state, required=True)
    parser.add_argument("--far-right", type=parse_state, required=True)
    parser.add_argument("--paired", type=parse_state, required=True)
    args = parser.parse_args()
    far_pair = (args.far_left, args.far_right)
    order = {value: index for index, value in enumerate(LENGTH_STATES)}
    if order[far_pair[0]] > order[far_pair[1]]:
        raise SystemExit("far pair must be supplied in symmetry order 1..6,L")

    started = time.perf_counter()
    rows = []
    signed = []
    stop = False
    for near_state in ROOT_STATES:
        for tail_state in ROOT_STATES:
            base = (
                base_value(near_state, 7) + base_value(tail_state, 7) + 1
                + base_value(args.paired, 7)
                + base_value(far_pair[0], 7) + base_value(far_pair[1], 7) + 8
            )
            threshold = max(0, 22 - base)
            names = coordinate_names(args.paired, near_state, tail_state, far_pair)
            if threshold:
                cover_threshold = math.ceil(threshold / len(names))
                variants = [(name, cover_threshold) for name in names]
            else:
                cover_threshold = 0
                variants = [(None, 0)]
            cells = []
            for shifted, shift in variants:
                cell = evaluate_cell(
                    args.paired, near_state, tail_state, far_pair, shifted, shift
                )
                cells.append(cell)
                if cell["negative_coefficients"] or sp.Rational(cell["constant_coefficient"]) <= 0:
                    signed.append({
                        "near_state": near_state,
                        "tail_state": tail_state,
                        "cell": cell,
                    })
                    stop = True
                    break
            rows.append({
                "near_state": near_state,
                "tail_state": tail_state,
                "base_suppressed_length_sum": base,
                "order_constraint_on_offsets": threshold,
                "cover_coordinate_threshold": cover_threshold,
                "cells": cells,
            })
            clear_cache()
            print("progress_patterns", len(rows), flush=True)
            if stop:
                break
        if stop:
            break

    total_cells = sum(len(row["cells"]) for row in rows)
    complete = len(rows) == 64 and not signed
    payload = {
        "schema": "rank8-delta2-e2-pendant-far-pair-paired-cell-v1",
        "status": (
            "PASS_EXACT_RANK8_DELTA2_E2_PENDANT_FAR_PAIR_PAIRED_CELL"
            if complete else "OBSTRUCTION_SIGNED_COEFFICIENT_CELL_FAIL_FAST"
        ),
        "far_pair": list(far_pair),
        "paired_state": args.paired,
        "scope": (
            "selected arm/root arbitrary; paired and unordered far pair as stated; bridge>=8; n>=23"
        ),
        "root_split": "near and tail are independently fixed 0..6 or long X+7",
        "order_cover": (
            "valid offsets have sum at least the base-order deficit; one coordinate is at least "
            "ceil(deficit/coordinate_count), giving the recorded conservative orthant union"
        ),
        "patterns_completed": len(rows),
        "symbolic_cells_completed": total_cells,
        "signed_cells": signed,
        "runtime_seconds": time.perf_counter() - started,
        "cells": rows,
    }
    label = f"far{far_pair[0]}_{far_pair[1]}_paired{args.paired}".replace("L", "long")
    output = HERE / f"rank8_delta2_e2_pendant_{label}_bridge_long_cells_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n")
    print(payload["status"])
    print("patterns", len(rows), "cells", total_cells, "signed", len(signed))
    print("runtime_seconds", payload["runtime_seconds"])
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
