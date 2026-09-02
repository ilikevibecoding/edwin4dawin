#!/usr/bin/env python3
"""Pendant-root e=2 Delta2 cells with a fixed short paired arm.

The two arms at the far branch are >=7 and the central bridge is >=8.
The selected arm/root position is split exactly by its near and tail gaps.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import time
from pathlib import Path

import sympy as sp
from sympy.core.cache import clear_cache

from probe_rank8_delta2_e2_symmetric_long_cells import convolution, double_count, pair_states
from run_rank8_delta2_e2_branch_short_long_cells import direct_pair_states, path_vector
from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
LONG = "L"
STATES = [0, 1, 2, 3, 4, 5, 6, LONG]
SOURCE_SYMBOLS = (*c[4:9], h[6], h[7])
DELTA2 = sp.Poly(sp.expand(newton_coefficients(residual())[2]), *SOURCE_SYMBOLS)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_states(paired_arm: int, near_state, tail_state):
    SR, G = sp.symbols("SR G", nonnegative=True)
    variables: list[sp.Symbol] = []

    if near_state == LONG:
        N = sp.symbols("N", nonnegative=True)
        variables.append(N)
        near = N + 7
    else:
        near = sp.Integer(near_state)

    if tail_state == LONG:
        U = sp.symbols("U", nonnegative=True)
        variables.append(U)
        tail = U + 7
    else:
        tail = sp.Integer(tail_state)

    selected_arm = near + tail + 1
    core_left = direct_pair_states(selected_arm, paired_arm, 8)
    deletion_left = direct_pair_states(near, paired_arm, 8)
    variables.extend((SR, G))
    right = pair_states(SR, sp.Integer(0), 8)
    bridge = G + 8
    return tuple(variables), core_left, deletion_left, right, bridge, tail


def evaluate_cell(paired_arm: int, near_state, tail_state):
    variables, core_left, deletion_left, right, bridge, tail = build_states(
        paired_arm, near_state, tail_state
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
        "near_state": near_state,
        "tail_state": tail_state,
        "variables": [str(v) for v in variables],
        "degrees": [result.degree(v) for v in variables],
        "terms": len(result.terms()),
        "negative_coefficients": len([value for value in coefficients if value < 0]),
        "minimum_coefficient": str(min(coefficients)),
        "constant_coefficient": str(result.coeff_monomial((0,) * len(variables))),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--paired-arm", type=int, choices=range(1, 7), required=True)
    args = parser.parse_args()
    paired_arm = args.paired_arm
    started = time.perf_counter()
    rows = []
    for near_state in STATES:
        for tail_state in STATES:
            rows.append(evaluate_cell(paired_arm, near_state, tail_state))
            clear_cache()
            print("progress_cells", len(rows), flush=True)

    signed = [
        row for row in rows
        if row["negative_coefficients"] or sp.Rational(row["constant_coefficient"]) <= 0
    ]
    payload = {
        "schema": "rank8-delta2-e2-pendant-fixed-paired-far-bridge-long-cells-v1",
        "status": (
            "PASS_EXACT_RANK8_DELTA2_E2_PENDANT_FIXED_PAIRED_FAR_BRIDGE_LONG"
            if not signed else "OBSTRUCTION_SIGNED_COEFFICIENT_CELLS"
        ),
        "paired_arm_length": paired_arm,
        "scope": (
            "every pendant-arm root with selected arm/root arbitrary, paired arm fixed as stated, "
            "two far arms >=7, and central bridge >=8"
        ),
        "root_split": "near and tail are independently fixed 0..6 or long X+7",
        "order_guard": (
            "the suppressed length sum is at least 1+paired+7+7+8=23+paired, "
            "so every such tree has order at least 24+paired >=25"
        ),
        "root_position_patterns": len(rows),
        "positive_symbolic_cells": len(rows) - len(signed),
        "signed_cells": signed,
        "runtime_seconds": time.perf_counter() - started,
        "cells": rows,
    }
    output = HERE / (
        f"rank8_delta2_e2_pendant_paired{paired_arm}_far_bridge_long_cells_exact_20260820.json"
    )
    output.write_text(json.dumps(payload, indent=2) + "\n")
    print(payload["status"])
    print("cells", len(rows), "signed", len(signed))
    print("runtime_seconds", payload["runtime_seconds"])
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
