#!/usr/bin/env python3
"""Symmetry-adapted exact long-cell probes for the e=2 double claw."""

from __future__ import annotations

import argparse
import hashlib
import json
import time
from functools import lru_cache
from pathlib import Path

import sympy as sp

from probe_rank8_delta2_e1_symbolic_cell import path_count
from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
PAIR_S, PAIR_P = sp.symbols("PAIR_S PAIR_P", nonnegative=True)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def convolution(factors: list[list[sp.Expr]], rank: int) -> sp.Expr:
    values = [sp.Integer(1)] + [sp.Integer(0)] * rank
    for factor in factors:
        values = [sum(values[j] * factor[k - j] for j in range(k + 1)) for k in range(rank + 1)]
    return sp.expand(values[rank])


def path_vector(order: sp.Expr, rank: int) -> list[sp.Expr]:
    return [path_count(order, k) for k in range(rank + 1)]


def shift(vector: list[sp.Expr], rank: int) -> list[sp.Expr]:
    return [sp.Integer(0)] + vector[:rank]


@lru_cache(maxsize=None)
def universal_pair_states(rank: int) -> tuple[tuple[sp.Expr, ...], tuple[sp.Expr, ...]]:
    """Two arms A+7,B+7 in elementary coordinates S=A+B,P=A*B."""
    A, B = sp.symbols("pair_A pair_B", nonnegative=True)
    excluded = []
    included_base = []
    for k in range(rank + 1):
        excluded.append(convolution([path_vector(A + 7, k), path_vector(B + 7, k)], k))
        if k < rank:
            included_base.append(convolution([path_vector(A + 6, k), path_vector(B + 6, k)], k))

    def convert(expression: sp.Expr) -> sp.Expr:
        symmetric, remainder, mapping = sp.symmetrize(expression, [A, B], formal=True)
        assert remainder == 0
        return sp.expand(symmetric.subs({mapping[0][0]: PAIR_S, mapping[1][0]: PAIR_P}))

    return tuple(convert(x) for x in excluded), tuple(convert(x) for x in shift(included_base, rank))


def pair_states(S: sp.Symbol, P: sp.Symbol, rank: int):
    excluded, included = universal_pair_states(rank)
    substitution = {PAIR_S: S, PAIR_P: P}
    return (
        [x.subs(substitution) for x in excluded],
        [x.subs(substitution) for x in included],
    )


def double_count(
    left0: list[sp.Expr],
    left1: list[sp.Expr],
    right0: list[sp.Expr],
    right1: list[sp.Expr],
    bridge: sp.Expr,
    rank: int,
) -> sp.Expr:
    return sp.expand(
        convolution([left0, right0, path_vector(bridge - 1, rank)], rank)
        + convolution([left1, right0, path_vector(bridge - 2, rank)], rank)
        + convolution([left0, right1, path_vector(bridge - 2, rank)], rank)
        + convolution([left1, right1, path_vector(bridge - 3, rank)], rank)
    )


def claw_from_pair(
    pair0: list[sp.Expr], pair1: list[sp.Expr], third_arm: sp.Expr, rank: int
) -> list[sp.Expr]:
    return [
        sp.expand(
            convolution([pair0[: k + 1], path_vector(third_arm, k)], k)
            + convolution([pair1[: k + 1], path_vector(third_arm - 1, k)], k)
        )
        for k in range(rank + 1)
    ]


def build(cell: str):
    SL, PL, SR, PR = sp.symbols("SL PL SR PR", nonnegative=True)
    if cell == "branch":
        G = sp.symbols("G", nonnegative=True)
        variables = (SL, PL, SR, PR, G)
        bridge = G + 8
    elif cell == "bridge_interior":
        N, M = sp.symbols("N M", nonnegative=True)
        variables = (SL, PL, SR, PR, N, M)
        bridge = N + M + 16
    elif cell == "pendant":
        X, U, SR, G = sp.symbols("X U SR G", nonnegative=True)
        variables = (X, U, SR, G)
        bridge = G + 8
    else:
        raise ValueError(cell)

    max_rank = 8
    if cell == "pendant":
        X, U, SR, G = variables
        # Long two-arm endpoint states depend only on the sum of their arm
        # offsets (the elementary-product coordinate cancels identically).
        left0, left1 = pair_states(X + U + 8, sp.Integer(0), max_rank)
        right0, right1 = pair_states(SR, sp.Integer(0), max_rank)
    else:
        left0, left1 = pair_states(SL, PL, max_rank)
        right0, right1 = pair_states(SR, PR, max_rank)
    raw = {
        c[k]: double_count(
            left0[: k + 1], left1[: k + 1], right0[: k + 1], right1[: k + 1], bridge, k
        )
        for k in range(4, 9)
    }
    if cell == "branch":
        for rank in (6, 7):
            right_claw = claw_from_pair(right0[: rank + 1], right1[: rank + 1], bridge - 1, rank)
            raw[h[rank]] = convolution([left0[: rank + 1], right_claw], rank)
        meta = {
            "root": "left branch vertex",
            "lengths": "arms A+7,B+7,C+7,D+7; bridge G+8",
            "symmetric_coordinates": "SL=A+B, PL=A*B, SR=C+D, PR=C*D",
        }
    elif cell == "bridge_interior":
        N, M = variables[-2:]
        for rank in (6, 7):
            left_claw = claw_from_pair(left0[: rank + 1], left1[: rank + 1], N + 7, rank)
            right_claw = claw_from_pair(right0[: rank + 1], right1[: rank + 1], M + 7, rank)
            raw[h[rank]] = convolution([left_claw, right_claw], rank)
        meta = {
            "root": "interior bridge vertex",
            "lengths": "arms A+7,B+7,C+7,D+7; left/right root gaps N+7,M+7; full bridge N+M+16",
            "symmetric_coordinates": "SL=A+B, PL=A*B, SR=C+D, PR=C*D",
        }
    else:
        X, U, SR, G = variables
        central_left0, central_left1 = pair_states(X, sp.Integer(0), 7)
        central_right0, central_right1 = pair_states(SR, sp.Integer(0), 7)
        for rank in (6, 7):
            central = [
                double_count(
                    central_left0[: k + 1],
                    central_left1[: k + 1],
                    central_right0[: k + 1],
                    central_right1[: k + 1],
                    bridge,
                    k,
                )
                for k in range(rank + 1)
            ]
            raw[h[rank]] = convolution([path_vector(U + 7, rank), central], rank)
        meta = {
            "root": "interior vertex of a pendant arm",
            "lengths": "near N+7, tail U+7, paired arm B+7, far arms C+7,D+7, bridge G+8",
            "compressed_coordinates": "X=N+B and SR=C+D; core left arm-offset sum is X+U+8, deletion left arm-offset sum is X",
        }
    return raw, variables, meta


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("cell", choices=("branch", "bridge_interior", "pendant"))
    args = parser.parse_args()
    started = time.perf_counter()
    raw, variables, meta = build(args.cell)
    values = {symbol: sp.Poly(value, *variables) for symbol, value in raw.items()}
    source_symbols = (*c[4:9], h[6], h[7])
    delta2 = sp.Poly(sp.expand(newton_coefficients(residual())[2]), *source_symbols)
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
        "schema": "rank8-delta2-e2-symmetric-long-cell-v1",
        "status": "PASS_POSITIVE_SYMMETRIC_COEFFICIENT_CELL" if negative == 0 and constant > 0 else "OBSTRUCTION_SIGNED_SYMMETRIC_COEFFICIENT_CELL",
        "scope": "one symmetry-adapted all-long double-claw cell; not an all-order e=2 theorem",
        "cell": args.cell,
        **meta,
        "basis_guard": "SL,PL,SR,PR are nonnegative on arm offsets; coefficient positivity in the larger independent nonnegative orthant is sufficient",
        "degrees": [result.degree(v) for v in variables],
        "terms": len(result.terms()),
        "negative_coefficients": negative,
        "positive_coefficients": len([value for value in coefficients if value > 0]),
        "minimum_coefficient": str(min(coefficients)),
        "constant_coefficient": str(constant),
        "runtime_seconds": time.perf_counter() - started,
    }
    output = HERE / f"rank8_delta2_e2_{args.cell}_symmetric_long_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n")
    print(payload["status"])
    print("cell", args.cell)
    print("degrees", payload["degrees"])
    print("terms", payload["terms"])
    print("negative_coefficients", negative)
    print("runtime_seconds", payload["runtime_seconds"])
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
