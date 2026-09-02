#!/usr/bin/env python3
"""Exact Delta0/Delta1 all-long cells for the e=3 quartic-star skeleton."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_rank8_delta2_e1_symbolic_cell import (
    claw_count as star_count,
    path_count,
)
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


def convolve_path_with_star(
    tail: sp.Expr, center_arms: tuple[sp.Expr, ...], rank: int
) -> sp.Expr:
    return sp.expand(
        sum(
            path_count(tail, j) * star_count(center_arms, rank - j)
            for j in range(rank + 1)
        )
    )


def build_raw(cell: str):
    if cell == "center":
        A, B, C, D = sp.symbols("A B C D", integer=True, nonnegative=True)
        variables = (A, B, C, D)
        arms = tuple(variable + 7 for variable in variables)
        raw = {c[k]: star_count(arms, k) for k in range(3, 9)}
        # Deleting the degree-four center leaves four disjoint paths.
        for k in (6, 7):
            raw[h[k]] = sp.expand(
                sum(
                    path_count(arms[0], i)
                    * path_count(arms[1], j)
                    * path_count(arms[2], ell)
                    * path_count(arms[3], k - i - j - ell)
                    for i in range(k + 1)
                    for j in range(k - i + 1)
                    for ell in range(k - i - j + 1)
                )
            )
        scope = {
            "root_type": "degree-four center",
            "arms": [str(arm) for arm in arms],
            "order": "n=29+A+B+C+D>=29",
        }
        return raw, variables, scope

    if cell == "arm":
        N, T, B, C, D = sp.symbols(
            "N T B C D", integer=True, nonnegative=True
        )
        variables = (N, T, B, C, D)
        near, tail = N + 7, T + 7
        other = (B + 7, C + 7, D + 7)
        arms = (near + tail + 1, *other)
        center_arms = (near, *other)
        raw = {c[k]: star_count(arms, k) for k in range(3, 9)}
        raw.update({
            h[k]: convolve_path_with_star(tail, center_arms, k)
            for k in (6, 7)
        })
        scope = {
            "root_type": "internal pendant-arm vertex",
            "near_vertices": str(near),
            "tail_vertices": str(tail),
            "other_arms": [str(arm) for arm in other],
            "order": "n=37+N+T+B+C+D>=37",
        }
        return raw, variables, scope
    raise ValueError(cell)


def evaluate(cell: str) -> dict:
    raw, variables, scope = build_raw(cell)
    polys = {symbol: sp.Poly(value, *variables) for symbol, value in raw.items()}
    rank_rows = {}
    for rank in RANKS:
        result = sp.Poly(0, *variables)
        for powers, coefficient in DELTA_TERMS[rank]:
            term = sp.Poly(coefficient, *variables)
            for symbol, power in zip(SOURCE_SYMBOLS, powers):
                if power:
                    term *= polys[symbol] ** power
            result += term
        coefficients = result.coeffs()
        negative = len([value for value in coefficients if value < 0])
        zero = len([value for value in coefficients if value == 0])
        rank_rows[str(rank)] = {
            "degrees": list(result.degree_list()),
            "terms": len(result.terms()),
            "negative_coefficients": negative,
            "zero_coefficients": zero,
            "positive_coefficients": len(
                [value for value in coefficients if value > 0]
            ),
            "minimum_coefficient": str(min(coefficients)),
            "constant_coefficient": str(
                result.coeff_monomial((0,) * len(variables))
            ),
        }
    passing = all(
        row["negative_coefficients"] == 0
        and row["zero_coefficients"] == 0
        and sp.Rational(row["minimum_coefficient"]) > 0
        and sp.Rational(row["constant_coefficient"]) > 0
        for row in rank_rows.values()
    )
    return {
        "schema": "rank8-delta01-e3-quartic-star-all-long-cell-agent-v1",
        "status": (
            "PASS_EXACT_POSITIVE_COEFFICIENT_CELL"
            if passing else "OBSTRUCTION_SIGNED_COEFFICIENT_CELL"
        ),
        "cell": cell,
        "degree_surplus": 3,
        "skeleton": "one degree-four center with four subdivided arms",
        "variables": [str(variable) for variable in variables],
        "scope": scope,
        "ranks": rank_rows,
        "source_dependencies": {
            "probe_rank8_delta2_e1_symbolic_cell.py": sha256(
                ROOT / "probe_rank8_delta2_e1_symbolic_cell.py"
            ),
            "verify_rank8_q8_terminal_reduction.py": sha256(
                ROOT / "verify_rank8_q8_terminal_reduction.py"
            ),
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This is one all-long e=3 skeleton/root cell. Short-boundary "
            "quartic-star cells, the cubic e=3 skeleton, and higher surplus remain."
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cell", choices=("center", "arm"), required=True)
    args = parser.parse_args()
    payload = evaluate(args.cell)
    output = ROOT / f"rank8_delta01_e3_quartic_star_{args.cell}_all_long_agent_20260822.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    for rank, row in payload["ranks"].items():
        print("RANK", rank, "TERMS", row["terms"], "NEG", row["negative_coefficients"], "MIN", row["minimum_coefficient"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(output))


if __name__ == "__main__":
    main()
