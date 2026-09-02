#!/usr/bin/env python3
"""Exact all-four-segments-long e=1 arm-root certificate for Delta0/1/3."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_rank8_delta2_e1_symbolic_cell import claw_count, path_count
from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


RANKS = (0, 1, 3)
SOURCE_SYMBOLS = (*c[3:9], h[6], h[7])
DELTA_TERMS = {
    rank: sp.Poly(
        sp.expand(newton_coefficients(residual())[rank]), *SOURCE_SYMBOLS
    ).terms()
    for rank in RANKS
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    D, U, B, C = sp.symbols("D U B C", integer=True, nonnegative=True)
    variables = (D, U, B, C)
    near, tail, other_b, other_c = D + 7, U + 7, B + 7, C + 7
    arms = (near + tail + 1, other_b, other_c)
    central_arms = (near, other_b, other_c)
    raw = {c[k]: claw_count(arms, k) for k in range(3, 9)}
    for coefficient_rank in (6, 7):
        central = [
            claw_count(central_arms, k) for k in range(coefficient_rank + 1)
        ]
        raw[h[coefficient_rank]] = sp.expand(
            sum(
                path_count(tail, j) * central[coefficient_rank - j]
                for j in range(coefficient_rank + 1)
            )
        )
    polys = {symbol: sp.Poly(value, *variables) for symbol, value in raw.items()}

    rows = {}
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
        assert negative == 0 and zero == 0 and min(coefficients) > 0, (
            rank,
            negative,
            zero,
            min(coefficients),
        )
        constant = result.coeff_monomial((0,) * len(variables))
        assert constant > 0, (rank, "constant", constant)
        rows[str(rank)] = {
            "degrees": list(result.degree_list()),
            "terms": len(result.terms()),
            "negative_coefficients": negative,
            "zero_coefficients": zero,
            "minimum_coefficient": str(min(coefficients)),
            "constant_coefficient": str(constant),
        }
        print("RANK_PASS", rank, rows[str(rank)], flush=True)

    payload = {
        "schema": "rank8-delta013-e1-arm-all-long-v1",
        "status": "PASS_EXACT_RANK8_DELTA013_E1_ARM_ALL_FOUR_SEGMENTS_LONG",
        "scope": "every arm-rooted subdivided claw with near, tail, and both other arms at least 7",
        "coordinates": {
            "near": "D+7",
            "tail": "U+7",
            "other_arms": ["B+7", "C+7"],
            "core_arms": ["D+U+15", "B+7", "C+7"],
        },
        "order_guard": "n=D+U+B+C+30>=30, hence inside n>=23",
        "ranks": rows,
        "conclusion": "Delta0,Delta1,Delta3 are strictly positive coefficientwise on the complete all-four-segments-long arm-root cell.",
        "dependency": "The separately certified Delta2 all-four-segments-long cell supplies the fourth pending rank.",
    }
    output = Path(__file__).with_name(
        "rank8_delta013_e1_arm_all_long_exact_20260820.json"
    )
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
