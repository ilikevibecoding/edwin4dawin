#!/usr/bin/env python3
"""Exact sparse coefficient probe for the all-long branch-rooted e=2 cell."""

from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path

import sympy as sp

from probe_rank8_delta2_e1_symbolic_cell import claw_count, path_count, product_path_count
from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def convolution(factors: list[list[sp.Expr]], rank: int) -> sp.Expr:
    values = [sp.Integer(1)] + [sp.Integer(0)] * rank
    for factor in factors:
        values = [sum(values[j] * factor[k - j] for j in range(k + 1)) for k in range(rank + 1)]
    return sp.expand(values[rank])


def path_vector(order: sp.Expr, rank: int) -> list[sp.Expr]:
    return [path_count(order, k) for k in range(rank + 1)]


def branch_states(arm1: sp.Expr, arm2: sp.Expr, rank: int):
    excluded = [convolution([path_vector(arm1, k), path_vector(arm2, k)], k) for k in range(rank + 1)]
    included_base = [
        convolution([path_vector(arm1 - 1, k), path_vector(arm2 - 1, k)], k)
        for k in range(rank)
    ]
    included = [sp.Integer(0)] + included_base
    return excluded, included


def double_claw_count(
    arms_bridge: tuple[sp.Expr, sp.Expr, sp.Expr, sp.Expr, sp.Expr], rank: int
) -> sp.Expr:
    a, b, bridge, cc, d = arms_bridge
    left0, left1 = branch_states(a, b, rank)
    right0, right1 = branch_states(cc, d, rank)
    return sp.expand(
        convolution([left0, right0, path_vector(bridge - 1, rank)], rank)
        + convolution([left1, right0, path_vector(bridge - 2, rank)], rank)
        + convolution([left0, right1, path_vector(bridge - 2, rank)], rank)
        + convolution([left1, right1, path_vector(bridge - 3, rank)], rank)
    )


def main() -> None:
    started = time.perf_counter()
    A, B, C, D, G = sp.symbols("A B C D G", integer=True, nonnegative=True)
    variables = (A, B, C, D, G)
    a, b, cc, d, bridge = A + 7, B + 7, C + 7, D + 7, G + 8
    lengths = (a, b, bridge, cc, d)
    raw = {c[k]: double_claw_count(lengths, k) for k in range(4, 9)}
    # Delete the left branch: its two pendant arms become separate paths; the
    # right branch is a generalized claw with bridge remainder bridge-1.
    for rank in (6, 7):
        right_component = [claw_count((cc, d, bridge - 1), k) for k in range(rank + 1)]
        raw[h[rank]] = convolution(
            [path_vector(a, rank), path_vector(b, rank), right_component], rank
        )
    values = {symbol: sp.Poly(value, *variables) for symbol, value in raw.items()}
    delta2 = sp.Poly(sp.expand(newton_coefficients(residual())[2]), *c[4:9], h[6], h[7])
    source_symbols = (*c[4:9], h[6], h[7])
    result = sp.Poly(0, *variables)
    for powers, coefficient in delta2.terms():
        term = sp.Poly(coefficient, *variables)
        for symbol, power in zip(source_symbols, powers):
            if power:
                term *= values[symbol] ** power
        result += term
    coefficients = result.coeffs()
    negative = len([value for value in coefficients if value < 0])
    constant = result.coeff_monomial((0,) * len(variables))
    payload = {
        "schema": "rank8-delta2-e2-branch-all-long-probe-v1",
        "status": "PASS_POSITIVE_COEFFICIENT_CELL" if negative == 0 and constant > 0 else "OBSTRUCTION_SIGNED_COEFFICIENT_CELL",
        "scope": "one all-long branch-rooted double-claw cell only; not an all-order e=2 theorem",
        "lengths": "pendant arms A+7,B+7,C+7,D+7; bridge G+8",
        "root": "left degree-3 branch vertex; side reversal covers the right branch",
        "degrees": [result.degree(v) for v in variables],
        "terms": len(result.terms()),
        "negative_coefficients": negative,
        "positive_coefficients": len([value for value in coefficients if value > 0]),
        "minimum_coefficient": str(min(coefficients)),
        "constant_coefficient": str(constant),
        "runtime_seconds": time.perf_counter() - started,
    }
    output = HERE / "rank8_delta2_e2_branch_all_long_sparse_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n")
    print(payload["status"])
    print("degrees", payload["degrees"])
    print("terms", payload["terms"])
    print("negative_coefficients", negative)
    print("runtime_seconds", payload["runtime_seconds"])
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
