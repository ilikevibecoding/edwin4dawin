#!/usr/bin/env python3
"""Bridge-rooted e=2 Delta2 cells with all four pendant arms long."""

from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path

import sympy as sp
from sympy.core.cache import clear_cache

from probe_rank8_delta2_e2_symmetric_long_cells import (
    convolution,
    claw_from_pair,
    double_count,
    pair_states,
)
from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
LONG = "L"
SOURCE_SYMBOLS = (*c[4:9], h[6], h[7])
DELTA2 = sp.Poly(sp.expand(newton_coefficients(residual())[2]), *SOURCE_SYMBOLS)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def gap_value(state, symbol):
    return symbol + 6 if state == LONG else sp.Integer(state)


def evaluate_cell(left_gap_state, right_gap_state):
    SL, SR = sp.symbols("SL SR", nonnegative=True)
    variables = [SL, SR]
    X = None
    Y = None
    if left_gap_state == LONG:
        X = sp.symbols("X", nonnegative=True)
        variables.append(X)
    if right_gap_state == LONG:
        Y = sp.symbols("Y", nonnegative=True)
        variables.append(Y)
    variables = tuple(variables)
    left_gap = gap_value(left_gap_state, X)
    right_gap = gap_value(right_gap_state, Y)
    bridge = left_gap + right_gap + 2
    left0, left1 = pair_states(SL, sp.Integer(0), 8)
    right0, right1 = pair_states(SR, sp.Integer(0), 8)
    raw = {
        c[k]: double_count(
            left0[: k + 1], left1[: k + 1], right0[: k + 1], right1[: k + 1], bridge, k
        )
        for k in range(4, 9)
    }
    for rank in (6, 7):
        left_claw = claw_from_pair(left0[: rank + 1], left1[: rank + 1], left_gap, rank)
        right_claw = claw_from_pair(right0[: rank + 1], right1[: rank + 1], right_gap, rank)
        raw[h[rank]] = convolution([left_claw, right_claw], rank)
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
        "left_gap": left_gap_state,
        "right_gap": right_gap_state,
        "variables": [str(v) for v in variables],
        "degrees": [result.degree(v) for v in variables],
        "terms": len(result.terms()),
        "negative_coefficients": len([value for value in coefficients if value < 0]),
        "minimum_coefficient": str(min(coefficients)),
        "constant_coefficient": str(constant),
    }


def main() -> None:
    started = time.perf_counter()
    states = [0, 1, 2, 3, 4, 5, LONG]
    rows = []
    for index, left in enumerate(states):
        for right in states[index:]:
            rows.append(evaluate_cell(left, right))
            clear_cache()
            print("progress_cells", len(rows), flush=True)
    signed = [
        row for row in rows
        if row["negative_coefficients"] or sp.Rational(row["constant_coefficient"]) <= 0
    ]
    payload = {
        "schema": "rank8-delta2-e2-bridge-all-long-arms-gap-cells-v1",
        "status": "PASS_EXACT_RANK8_DELTA2_E2_BRIDGE_ALL_LONG_ARMS_ALL_ROOT_POSITIONS" if not signed else "OBSTRUCTION_SIGNED_COEFFICIENT_CELLS",
        "scope": "every bridge-interior root of every e=2 double claw whose four pendant arms are >=7; arbitrary positive central bridge length and arbitrary internal root position",
        "gap_split": "the numbers of vertices strictly between the root and the two branch vertices are fixed 0..5 or long X+6",
        "symmetry": "side reversal makes the two gap states unordered; the corresponding pendant-pair sum coordinates swap",
        "gap_patterns": len(rows),
        "positive_symbolic_cells": len(rows) - len(signed),
        "signed_cells": signed,
        "runtime_seconds": time.perf_counter() - started,
        "cells": rows,
    }
    output = HERE / "rank8_delta2_e2_bridge_all_long_arms_gap_cells_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n")
    print(payload["status"])
    print("cells", len(rows), "signed", len(signed))
    print("runtime_seconds", payload["runtime_seconds"])
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
