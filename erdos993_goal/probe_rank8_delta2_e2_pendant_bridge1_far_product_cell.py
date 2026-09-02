#!/usr/bin/env python3
"""Diagnostic retaining the long far-arm symmetric product coordinate."""

from __future__ import annotations

import argparse

import sympy as sp

from probe_rank8_delta2_e2_symmetric_long_cells import pair_states
from run_rank8_delta2_e2_pendant_fixed_bridge_far_long_root_side_arbitrary_cells import (
    DELTA2, LONG, SOURCE_SYMBOLS, convolution, direct_pair_states, double_count,
    path_vector,
)
from verify_rank8_q8_terminal_reduction import c, h


def parse_state(value, minimum):
    if value.upper() == LONG:
        return LONG
    parsed = int(value)
    if parsed < minimum or parsed > 6:
        raise argparse.ArgumentTypeError(value)
    return parsed


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--paired", type=lambda x: parse_state(x, 1), required=True)
    parser.add_argument("--near", type=lambda x: parse_state(x, 0), required=True)
    parser.add_argument("--tail", type=lambda x: parse_state(x, 0), required=True)
    args = parser.parse_args()

    symbols = {}
    if args.paired == LONG and args.near == LONG:
        symbols["X"] = sp.symbols("X", nonnegative=True)
    else:
        if args.paired == LONG:
            symbols["B"] = sp.symbols("B", nonnegative=True)
        if args.near == LONG:
            symbols["N"] = sp.symbols("N", nonnegative=True)
    if args.tail == LONG:
        symbols["U"] = sp.symbols("U", nonnegative=True)
    symbols["SR"] = sp.symbols("SR", nonnegative=True)
    symbols["PR"] = sp.symbols("PR", nonnegative=True)

    if args.paired == LONG:
        if args.near == LONG:
            X = symbols["X"]
            deletion_left = pair_states(X, sp.Integer(0), 8)
            if args.tail == LONG:
                tail = symbols["U"] + 7
                core_left = pair_states(X + symbols["U"] + 8, sp.Integer(0), 8)
            else:
                tail = sp.Integer(args.tail)
                core_left = pair_states(X + tail + 1, sp.Integer(0), 8)
        else:
            near = sp.Integer(args.near)
            B = symbols["B"]
            deletion_left = direct_pair_states(near, B + 7, 8)
            if args.tail == LONG:
                tail = symbols["U"] + 7
                core_left = pair_states(B + symbols["U"] + near + 1, sp.Integer(0), 8)
            else:
                tail = sp.Integer(args.tail)
                core_left = direct_pair_states(near + tail + 1, B + 7, 8)
    else:
        paired = int(args.paired)
        near = symbols["N"] + 7 if args.near == LONG else sp.Integer(args.near)
        tail = symbols["U"] + 7 if args.tail == LONG else sp.Integer(args.tail)
        core_left = direct_pair_states(near + tail + 1, paired, 8)
        deletion_left = direct_pair_states(near, paired, 8)

    right = pair_states(symbols["SR"], symbols["PR"], 8)
    core_left0, core_left1 = core_left
    deletion_left0, deletion_left1 = deletion_left
    right0, right1 = right
    raw = {
        c[k]: double_count(
            core_left0[: k + 1], core_left1[: k + 1],
            right0[: k + 1], right1[: k + 1], sp.Integer(1), k,
        )
        for k in range(4, 9)
    }
    for rank in (6, 7):
        central = [
            double_count(
                deletion_left0[: k + 1], deletion_left1[: k + 1],
                right0[: k + 1], right1[: k + 1], sp.Integer(1), k,
            )
            for k in range(rank + 1)
        ]
        raw[h[rank]] = convolution([path_vector(tail, rank), central], rank)

    variables = tuple(symbols.values())
    values = {symbol: sp.Poly(value, *variables) for symbol, value in raw.items()}
    result = sp.Poly(0, *variables)
    for powers, coefficient in DELTA2.terms():
        term = sp.Poly(coefficient, *variables)
        for symbol, power_value in zip(SOURCE_SYMBOLS, powers):
            if power_value:
                term *= values[symbol] ** power_value
        result += term
    coefficients = result.coeffs()
    print({
        "paired_state": args.paired,
        "near_state": args.near,
        "tail_state": args.tail,
        "variables": [str(value) for value in variables],
        "degrees": [result.degree(value) for value in variables],
        "terms": len(result.terms()),
        "far_product_degree": result.degree(symbols["PR"]),
        "negative_coefficients": sum(1 for value in coefficients if value < 0),
        "minimum_coefficient": str(min(coefficients)),
    }, flush=True)


if __name__ == "__main__":
    main()
