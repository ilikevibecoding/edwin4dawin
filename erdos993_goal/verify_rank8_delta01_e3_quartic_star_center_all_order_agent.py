#!/usr/bin/env python3
"""Exact all-order Delta0/Delta1 theorem for center-rooted e=3 quartic stars."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from pathlib import Path

import sympy as sp
from sympy.core.cache import clear_cache

from probe_rank8_delta01_e3_quartic_star_all_long_compressed_agent import (
    convolve,
    two_long_paths,
)
from probe_rank8_delta2_e1_symbolic_cell import path_count
from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta01_e3_quartic_star_center_all_order_exact_agent_20260822.json"
RANKS = (0, 1)
SOURCE_SYMBOLS = (*c[3:9], h[6], h[7])
DELTA_TERMS = {
    rank: sp.Poly(
        sp.expand(newton_coefficients(residual())[rank]), *SOURCE_SYMBOLS
    ).terms()
    for rank in RANKS
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def vector_product(factors: list[list[sp.Expr]], max_rank: int) -> list[sp.Expr]:
    values = [sp.Integer(1)] + [sp.Integer(0)] * max_rank
    for factor in factors:
        values = [
            sp.expand(sum(values[j] * factor[k - j] for j in range(k + 1)))
            for k in range(max_rank + 1)
        ]
    return values


def path_vector(order: sp.Expr, max_rank: int) -> list[sp.Expr]:
    return [path_count(order, rank) for rank in range(max_rank + 1)]


def build_raw(long_count: int, shorts: tuple[int, ...], shift: int):
    max_rank = 8
    variables: tuple[sp.Symbol, ...]
    excluded_factors: list[list[sp.Expr]] = []
    reduced_factors: list[list[sp.Expr]] = []

    if long_count == 4:
        SL, SR = sp.symbols("SL SR", integer=True, nonnegative=True)
        variables = (SL, SR)
        excluded_factors.extend([
            two_long_paths(SL + 14 + shift, max_rank),
            two_long_paths(SR + 14, max_rank),
        ])
        reduced_factors.extend([
            two_long_paths(SL + 12 + shift, max_rank),
            two_long_paths(SR + 12, max_rank),
        ])
    elif long_count == 3:
        L, S = sp.symbols("L S", integer=True, nonnegative=True)
        variables = (L, S)
        excluded_factors.extend([
            path_vector(L + 7 + shift, max_rank),
            two_long_paths(S + 14, max_rank),
        ])
        reduced_factors.extend([
            path_vector(L + 6 + shift, max_rank),
            two_long_paths(S + 12, max_rank),
        ])
    elif long_count == 2:
        S = sp.symbols("S", integer=True, nonnegative=True)
        variables = (S,)
        excluded_factors.append(two_long_paths(S + 14 + shift, max_rank))
        reduced_factors.append(two_long_paths(S + 12 + shift, max_rank))
    elif long_count == 1:
        L = sp.symbols("L", integer=True, nonnegative=True)
        variables = (L,)
        excluded_factors.append(path_vector(L + 7 + shift, max_rank))
        reduced_factors.append(path_vector(L + 6 + shift, max_rank))
    else:
        raise ValueError(long_count)

    for short in shorts:
        excluded_factors.append(path_vector(short, max_rank))
        reduced_factors.append(path_vector(short - 1, max_rank))
    excluded = vector_product(excluded_factors, max_rank)
    reduced = vector_product(reduced_factors, max_rank)
    star = [
        sp.expand(excluded[rank] + (reduced[rank - 1] if rank else 0))
        for rank in range(max_rank + 1)
    ]
    raw = {c[k]: star[k] for k in range(3, 9)}
    raw.update({h[k]: excluded[k] for k in (6, 7)})
    return raw, variables


def evaluate_cell(long_count: int, shorts: tuple[int, ...], shift: int) -> dict:
    raw, variables = build_raw(long_count, shorts, shift)
    values = {symbol: sp.Poly(value, *variables) for symbol, value in raw.items()}
    rows = {}
    for rank in RANKS:
        result = sp.Poly(0, *variables)
        for powers, coefficient in DELTA_TERMS[rank]:
            term = sp.Poly(coefficient, *variables)
            for symbol, power in zip(SOURCE_SYMBOLS, powers):
                if power:
                    term *= values[symbol] ** power
            result += term
        coefficients = result.coeffs()
        negative = len([value for value in coefficients if value < 0])
        zero = len([value for value in coefficients if value == 0])
        constant = result.coeff_monomial((0,) * len(variables))
        assert negative == 0 and zero == 0 and min(coefficients) > 0
        assert constant > 0
        rows[str(rank)] = {
            "degrees": list(result.degree_list()),
            "terms": len(result.terms()),
            "negative_coefficients": negative,
            "zero_coefficients": zero,
            "minimum_coefficient": str(min(coefficients)),
            "constant_coefficient": str(constant),
        }
    return {
        "long_arms": long_count,
        "short_arms": list(shorts),
        "shift": shift,
        "variables": [str(variable) for variable in variables],
        "ranks": rows,
    }


def main() -> None:
    cells = []
    for long_count in range(4, 0, -1):
        short_count = 4 - long_count
        for shorts in itertools.combinations_with_replacement(range(1, 7), short_count):
            baseline_order = 1 + 7 * long_count + sum(shorts)
            offset_total_needed = max(0, 27 - baseline_order)
            shift = math.ceil(offset_total_needed / long_count)
            cell = evaluate_cell(long_count, shorts, shift)
            cell.update({
                "baseline_order_before_shift": baseline_order,
                "offset_total_needed": offset_total_needed,
                "coverage": (
                    "by symmetry among the long arms and the pigeonhole "
                    f"bound, one long offset is at least {shift}; move that "
                    "arm to the distinguished compressed group"
                ),
            })
            cells.append(cell)
            print("CELL_PASS", long_count, shorts, shift, flush=True)
            clear_cache()

    assert len(cells) == 84
    assert {row["long_arms"] for row in cells} == {1, 2, 3, 4}
    totals = {
        str(rank): {
            "cells": len(cells),
            "coefficients": sum(cell["ranks"][str(rank)]["terms"] for cell in cells),
            "negative_coefficients": 0,
            "zero_coefficients": 0,
            "minimum_coefficient": str(
                min(
                    sp.Rational(cell["ranks"][str(rank)]["minimum_coefficient"])
                    for cell in cells
                )
            ),
        }
        for rank in RANKS
    }
    payload = {
        "schema": "rank8-delta01-e3-quartic-star-center-all-order-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA01_E3_QUARTIC_STAR_CENTER_ALL_N27_PLUS",
        "theorem": (
            "For every subdivision A of the four-arm star with |A|>=27, "
            "rooted at its unique degree-four center, Delta0>0 and Delta1>0."
        ),
        "no_gap_short_long_partition": {
            "long_arm_convention": "X+7 with X>=0",
            "short_arm_convention": "fixed length in 1..6",
            "four_long": 1,
            "three_long_one_short": 6,
            "two_long_two_short_unordered": 21,
            "one_long_three_short_unordered": 56,
            "zero_long": "impossible at order n>=27 because n<=25",
            "total_cells": 84,
            "order_cover": (
                "if the long-offset sum is at least T, some one of m "
                "symmetric long offsets is at least ceil(T/m); shifting "
                "that representative covers the full order orthant"
            ),
        },
        "rank_totals": totals,
        "cells": cells,
        "immutable_dependencies": {
            "probe_rank8_delta01_e3_quartic_star_all_long_compressed_agent.py": sha256(
                ROOT / "probe_rank8_delta01_e3_quartic_star_all_long_compressed_agent.py"
            ),
            "probe_rank8_delta2_e1_symbolic_cell.py": sha256(
                ROOT / "probe_rank8_delta2_e1_symbolic_cell.py"
            ),
            "verify_rank8_q8_terminal_reduction.py": sha256(
                ROOT / "verify_rank8_q8_terminal_reduction.py"
            ),
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This closes the center-root orbit only. Arm-root short boundaries, "
            "the other e=3 skeleton, Delta2/Delta3, and higher surplus remain."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("TOTALS", totals)
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
