#!/usr/bin/env python3
"""Pendant e=2 cells with fixed short bridge and long far arms.

The selected arm/root position and paired arm are arbitrary.  The order-n>=23
restriction is covered by shifted nonnegative-coordinate orthants.
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
PAIRED_STATES = [1, 2, 3, 4, 5, 6, LONG]
SOURCE_SYMBOLS = (*c[4:9], h[6], h[7])
DELTA2 = sp.Poly(sp.expand(newton_coefficients(residual())[2]), *SOURCE_SYMBOLS)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def base_value(state, long_base: int) -> int:
    return long_base if state == LONG else int(state)


def coordinate_names(paired_state, near_state, tail_state):
    names = []
    if paired_state == LONG and near_state == LONG:
        names.append("X")  # sum of paired and near offsets
    else:
        if paired_state == LONG:
            names.append("B")
        if near_state == LONG:
            names.append("N")
    if tail_state == LONG:
        names.append("U")
    names.append("SR")  # sum of the two far-arm offsets
    return names


def build_states(paired_state, near_state, tail_state, bridge: int, shifted, shift: int):
    names = coordinate_names(paired_state, near_state, tail_state)
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
                core_left = pair_states(X + U + 8, sp.Integer(0), 8)
                tail = U + 7
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

    SR = coord("SR")
    right = pair_states(SR, sp.Integer(0), 8)
    variables = tuple(symbols[name] for name in names)
    return variables, core_left, deletion_left, right, sp.Integer(bridge), tail


def evaluate_cell(paired_state, near_state, tail_state, bridge, shifted, shift):
    variables, core_left, deletion_left, right, bridge_expr, tail = build_states(
        paired_state, near_state, tail_state, bridge, shifted, shift
    )
    core_left0, core_left1 = core_left
    deletion_left0, deletion_left1 = deletion_left
    right0, right1 = right
    raw = {
        c[k]: double_count(
            core_left0[: k + 1], core_left1[: k + 1],
            right0[: k + 1], right1[: k + 1], bridge_expr, k
        )
        for k in range(4, 9)
    }
    for rank in (6, 7):
        central = [
            double_count(
                deletion_left0[: k + 1], deletion_left1[: k + 1],
                right0[: k + 1], right1[: k + 1], bridge_expr, k
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
    parser.add_argument("--bridge-length", type=int, choices=range(1, 8), required=True)
    args = parser.parse_args()
    bridge = args.bridge_length
    started = time.perf_counter()
    rows = []

    for paired_state in PAIRED_STATES:
        for near_state in ROOT_STATES:
            for tail_state in ROOT_STATES:
                base = (
                    base_value(near_state, 7) + base_value(tail_state, 7) + 1
                    + base_value(paired_state, 7) + 7 + 7 + bridge
                )
                threshold = max(0, 22 - base)
                names = coordinate_names(paired_state, near_state, tail_state)
                if threshold:
                    cover_threshold = math.ceil(threshold / len(names))
                    variants = [(name, cover_threshold) for name in names]
                else:
                    cover_threshold = 0
                    variants = [(None, 0)]
                cells = [
                    evaluate_cell(
                        paired_state, near_state, tail_state, bridge,
                        shifted, shift
                    )
                    for shifted, shift in variants
                ]
                rows.append({
                    "paired_state": paired_state,
                    "near_state": near_state,
                    "tail_state": tail_state,
                    "base_suppressed_length_sum": base,
                    "order_constraint_on_offsets": threshold,
                    "cover_coordinate_threshold": cover_threshold,
                    "cells": cells,
                })
                clear_cache()
                if len(rows) % 16 == 0:
                    print("progress_patterns", len(rows), flush=True)

    signed = [
        {
            "paired_state": row["paired_state"],
            "near_state": row["near_state"],
            "tail_state": row["tail_state"],
            "cell": cell,
        }
        for row in rows for cell in row["cells"]
        if cell["negative_coefficients"] or sp.Rational(cell["constant_coefficient"]) <= 0
    ]
    total_cells = sum(len(row["cells"]) for row in rows)
    payload = {
        "schema": "rank8-delta2-e2-pendant-fixed-bridge-far-long-root-side-arbitrary-cells-v1",
        "status": (
            "PASS_EXACT_RANK8_DELTA2_E2_PENDANT_FIXED_BRIDGE_FAR_LONG_ROOT_SIDE_ARBITRARY"
            if not signed else "OBSTRUCTION_SIGNED_COEFFICIENT_CELLS"
        ),
        "bridge_length": bridge,
        "scope": (
            "every pendant root with selected arm/root and paired arm arbitrary, two far arms >=7, "
            "central bridge fixed as stated, and tree order n>=23"
        ),
        "root_split": "near and tail are independently fixed 0..6 or long X+7",
        "paired_split": "paired arm is fixed 1..6 or long B+7",
        "order_cover": (
            "if the base suppressed length sum is below 22, valid offsets have sum at least the deficit; "
            "one coordinate is therefore at least ceil(deficit/coordinate_count), giving the recorded union"
        ),
        "patterns": len(rows),
        "symbolic_cells": total_cells,
        "positive_symbolic_cells": total_cells - len(signed),
        "signed_cells": signed,
        "runtime_seconds": time.perf_counter() - started,
        "cells": rows,
    }
    output = HERE / f"rank8_delta2_e2_pendant_bridge{bridge}_far_long_root_side_arbitrary_cells_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n")
    print(payload["status"])
    print("patterns", len(rows), "cells", total_cells, "signed", len(signed))
    print("runtime_seconds", payload["runtime_seconds"])
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
