#!/usr/bin/env python3
"""Compressed exact Delta0/Delta1 all-long cells for the e=3 quartic star.

For ranks through eight, two path arms of orders at least seven depend only
on their total order.  Pairing the four arms reduces the center-root cell to
two variables and every internal-arm-root cell to three variables.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import time
from pathlib import Path

import sympy as sp

from probe_rank8_delta2_e1_symbolic_cell import path_count
from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


ROOT = Path(__file__).resolve().parent
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


def convolve(left: list[sp.Expr], right: list[sp.Expr], rank: int) -> sp.Expr:
    return sp.expand(sum(left[j] * right[rank - j] for j in range(rank + 1)))


def two_long_paths(total_order: sp.Expr, max_rank: int) -> list[sp.Expr]:
    """Truncated product I(P_a)I(P_b), a,b>=7, as a function of a+b."""
    return [
        sp.expand(
            sum(
                path_count(total_order - 4 * selected_pairs, rank - 2 * selected_pairs)
                for selected_pairs in range(rank // 2 + 1)
            )
        )
        for rank in range(max_rank + 1)
    ]


def four_arm_star(
    left_pair_total: sp.Expr,
    right_pair_total: sp.Expr,
    max_rank: int,
) -> list[sp.Expr]:
    left_excluded = two_long_paths(left_pair_total, max_rank)
    right_excluded = two_long_paths(right_pair_total, max_rank)
    # When the center is selected, every arm loses its first vertex.
    left_reduced = two_long_paths(left_pair_total - 2, max_rank)
    right_reduced = two_long_paths(right_pair_total - 2, max_rank)
    return [
        sp.expand(
            convolve(left_excluded[: rank + 1], right_excluded[: rank + 1], rank)
            + (
                sp.Integer(0)
                if rank == 0
                else convolve(
                    left_reduced[:rank], right_reduced[:rank], rank - 1
                )
            )
        )
        for rank in range(max_rank + 1)
    ]


def build_raw(cell: str):
    if cell == "center":
        SL, SR = sp.symbols("SL SR", integer=True, nonnegative=True)
        variables = (SL, SR)
        left_total, right_total = SL + 14, SR + 14
        core = four_arm_star(left_total, right_total, 8)
        left_paths = two_long_paths(left_total, 7)
        right_paths = two_long_paths(right_total, 7)
        raw = {c[k]: core[k] for k in range(3, 9)}
        raw.update({
            h[k]: convolve(left_paths[: k + 1], right_paths[: k + 1], k)
            for k in (6, 7)
        })
        meta = {
            "root_type": "degree-four center",
            "literal_lengths": "four arms A+7,B+7,C+7,D+7",
            "compressed_coordinates": "SL=A+B, SR=C+D",
            "order_expression": "n=29+SL+SR",
        }
        return raw, variables, meta

    if cell == "arm":
        X, T, SR = sp.symbols("X T SR", integer=True, nonnegative=True)
        variables = (X, T, SR)
        # Literal offsets are near=N, tail=T, paired=B, far=C,D.  X=N+B.
        # Core left pair: selected arm (N+T+15) plus paired arm (B+7).
        core_left_total = X + T + 22
        far_total = SR + 14
        core = four_arm_star(core_left_total, far_total, 8)
        # Deleting the root leaves P_(T+7) and a four-arm star whose left
        # pair has orders N+7 and B+7, hence total X+14.
        deleted_center = four_arm_star(X + 14, far_total, 7)
        tail = [path_count(T + 7, k) for k in range(8)]
        raw = {c[k]: core[k] for k in range(3, 9)}
        raw.update({
            h[k]: convolve(tail[: k + 1], deleted_center[: k + 1], k)
            for k in (6, 7)
        })
        meta = {
            "root_type": "internal vertex of one pendant arm",
            "literal_lengths": "near N+7, tail T+7, paired B+7, far C+7,D+7",
            "compressed_coordinates": "X=N+B, SR=C+D",
            "order_expression": "n=37+X+T+SR",
        }
        return raw, variables, meta
    raise ValueError(cell)


def evaluate(cell: str) -> dict:
    started = time.perf_counter()
    raw, variables, meta = build_raw(cell)
    values = {symbol: sp.Poly(value, *variables) for symbol, value in raw.items()}
    rank_rows = {}
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
        rank_rows[str(rank)] = {
            "degrees": list(result.degree_list()),
            "terms": len(result.terms()),
            "negative_coefficients": negative,
            "zero_coefficients": zero,
            "positive_coefficients": len(
                [value for value in coefficients if value > 0]
            ),
            "minimum_coefficient": str(min(coefficients)),
            "constant_coefficient": str(constant),
        }
    passing = all(
        row["negative_coefficients"] == 0
        and row["zero_coefficients"] == 0
        and sp.Rational(row["minimum_coefficient"]) > 0
        and sp.Rational(row["constant_coefficient"]) > 0
        for row in rank_rows.values()
    )
    return {
        "schema": "rank8-delta01-e3-quartic-star-all-long-compressed-agent-v1",
        "status": (
            "PASS_EXACT_POSITIVE_COMPRESSED_COEFFICIENT_CELL"
            if passing else "OBSTRUCTION_SIGNED_COMPRESSED_COEFFICIENT_CELL"
        ),
        "cell": cell,
        "degree_surplus": 3,
        "skeleton": "one degree-four center with four subdivided arms",
        **meta,
        "variables": [str(variable) for variable in variables],
        "compression_identity": (
            "for a,b>=7 and rank k<=8, [x^k]I(P_a)I(P_b)="
            "sum_j [x^(k-2j)]I(P_(a+b-4j))"
        ),
        "basis_guard": (
            "all compressed coordinates are nonnegative on the literal "
            "all-long cell; coefficient positivity on their independent "
            "orthant is sufficient"
        ),
        "ranks": rank_rows,
        "runtime_seconds": time.perf_counter() - started,
        "immutable_dependencies": {
            "probe_rank8_delta2_e1_symbolic_cell.py": sha256(
                ROOT / "probe_rank8_delta2_e1_symbolic_cell.py"
            ),
            "verify_rank8_q8_terminal_reduction.py": sha256(
                ROOT / "verify_rank8_q8_terminal_reduction.py"
            ),
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This closes only the all-long quartic-star center and arm root "
            "cells when assembled. Short-boundary cells, the cubic e=3 "
            "skeleton, and all e>=4 cores remain."
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cell", choices=("center", "arm"), required=True)
    args = parser.parse_args()
    payload = evaluate(args.cell)
    output = ROOT / (
        f"rank8_delta01_e3_quartic_star_{args.cell}_all_long_compressed_agent_20260822.json"
    )
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    for rank, row in payload["ranks"].items():
        print("RANK", rank, "TERMS", row["terms"], "NEG", row["negative_coefficients"], "MIN", row["minimum_coefficient"])
    print("RUNTIME", payload["runtime_seconds"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(output))


if __name__ == "__main__":
    main()
