#!/usr/bin/env python3
"""Pendant-root e=2 Delta2 cells with the other three arms and bridge long."""

from __future__ import annotations

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
SOURCE_SYMBOLS = (*c[4:9], h[6], h[7])
DELTA2 = sp.Poly(sp.expand(newton_coefficients(residual())[2]), *SOURCE_SYMBOLS)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_states(near_state, tail_state):
    SR, G = sp.symbols("SR G", nonnegative=True)
    variables = []
    if near_state == LONG:
        X = sp.symbols("X", nonnegative=True)  # near offset + paired-arm offset
        variables.append(X)
        deletion_left0, deletion_left1 = pair_states(X, sp.Integer(0), 8)
        if tail_state == LONG:
            U = sp.symbols("U", nonnegative=True)
            variables.append(U)
            core_left0, core_left1 = pair_states(X + U + 8, sp.Integer(0), 8)
            tail = U + 7
        else:
            U = None
            core_left0, core_left1 = pair_states(X + int(tail_state) + 1, sp.Integer(0), 8)
            tail = sp.Integer(tail_state)
    else:
        B = sp.symbols("B", nonnegative=True)  # paired-arm offset
        variables.append(B)
        deletion_left0, deletion_left1 = direct_pair_states(int(near_state), B + 7, 8)
        if tail_state == LONG:
            U = sp.symbols("U", nonnegative=True)
            variables.append(U)
            # selected arm = U+7+near+1 = (U+near+1)+7; both core arms long.
            core_left0, core_left1 = pair_states(B + U + int(near_state) + 1, sp.Integer(0), 8)
            tail = U + 7
        else:
            U = None
            selected = int(near_state) + int(tail_state) + 1
            core_left0, core_left1 = direct_pair_states(selected, B + 7, 8)
            tail = sp.Integer(tail_state)
    variables.extend((SR, G))
    variables = tuple(variables)
    right0, right1 = pair_states(SR, sp.Integer(0), 8)
    bridge = G + 8
    return variables, (core_left0, core_left1), (deletion_left0, deletion_left1), (right0, right1), bridge, tail


def evaluate_cell(near_state, tail_state):
    variables, core_left, deletion_left, right, bridge, tail = build_states(near_state, tail_state)
    core_left0, core_left1 = core_left
    deletion_left0, deletion_left1 = deletion_left
    right0, right1 = right
    raw = {
        c[k]: double_count(
            core_left0[: k + 1], core_left1[: k + 1], right0[: k + 1], right1[: k + 1], bridge, k
        )
        for k in range(4, 9)
    }
    for rank in (6, 7):
        central = [
            double_count(
                deletion_left0[: k + 1],
                deletion_left1[: k + 1],
                right0[: k + 1],
                right1[: k + 1],
                bridge,
                k,
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
    constant = result.coeff_monomial((0,) * len(variables))
    return {
        "near_state": near_state,
        "tail_state": tail_state,
        "variables": [str(v) for v in variables],
        "degrees": [result.degree(v) for v in variables],
        "terms": len(result.terms()),
        "negative_coefficients": len([value for value in coefficients if value < 0]),
        "minimum_coefficient": str(min(coefficients)),
        "constant_coefficient": str(constant),
    }


def main() -> None:
    started = time.perf_counter()
    states = [0, 1, 2, 3, 4, 5, 6, LONG]
    rows = []
    for near in states:
        for tail in states:
            rows.append(evaluate_cell(near, tail))
            clear_cache()
            print("progress_cells", len(rows), flush=True)
    signed = [
        row for row in rows
        if row["negative_coefficients"] or sp.Rational(row["constant_coefficient"]) <= 0
    ]
    payload = {
        "schema": "rank8-delta2-e2-pendant-other-edges-long-root-position-cells-v1",
        "status": "PASS_EXACT_RANK8_DELTA2_E2_PENDANT_OTHER_EDGES_LONG_ALL_ROOT_POSITIONS" if not signed else "OBSTRUCTION_SIGNED_COEFFICIENT_CELLS",
        "scope": "every pendant-arm root of every e=2 double claw whose paired arm, both far arms, and central bridge are long (arms>=7, bridge>=8); arbitrary selected-arm length/root position",
        "root_split": "near=d-1 and tail=a-d are each fixed 0..6 or long X+7",
        "compression": "if near and the paired arm are long, use their exact offset sum; the core pair adds the tail offset and the deletion pair does not",
        "root_position_patterns": len(rows),
        "positive_symbolic_cells": len(rows) - len(signed),
        "signed_cells": signed,
        "runtime_seconds": time.perf_counter() - started,
        "cells": rows,
    }
    output = HERE / "rank8_delta2_e2_pendant_other_edges_long_root_position_cells_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n")
    print(payload["status"])
    print("cells", len(rows), "signed", len(signed))
    print("runtime_seconds", payload["runtime_seconds"])
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
