#!/usr/bin/env python3
"""Sparse exact coefficient test for the all-long arm-rooted e=1 cell."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_rank8_delta2_e1_symbolic_cell import claw_count, path_count
from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


def main() -> None:
    D, U, B, C = sp.symbols("D U B C", integer=True, nonnegative=True)
    variables = (D, U, B, C)
    near, tail, other_b, other_c = D + 7, U + 7, B + 7, C + 7
    arms = (near + tail + 1, other_b, other_c)
    central_arms = (near, other_b, other_c)
    raw = {c[k]: claw_count(arms, k) for k in range(4, 9)}
    for rank in (6, 7):
        central = [claw_count(central_arms, k) for k in range(rank + 1)]
        raw[h[rank]] = sp.expand(
            sum(path_count(tail, j) * central[rank - j] for j in range(rank + 1))
        )
    values = {symbol: sp.Poly(value, *variables) for symbol, value in raw.items()}
    delta2 = sp.Poly(sp.expand(newton_coefficients(residual())[2]), *c[4:9], h[6], h[7])
    result = sp.Poly(0, *variables)
    for powers, coefficient in delta2.terms():
        term = sp.Poly(coefficient, *variables)
        for symbol, power in zip((*c[4:9], h[6], h[7]), powers):
            if power:
                term *= values[symbol] ** power
        result += term
    coefficients = result.coeffs()
    negative_count = len([value for value in coefficients if value < 0])
    positive_count = len([value for value in coefficients if value > 0])
    payload = {
        "status": "PASS_POSITIVE_COEFFICIENT_CELL" if negative_count == 0 else "OBSTRUCTION_SIGNED_COEFFICIENT_CELL",
        "cell": "e=1 root on an arm; near, tail, and two other arms all >=7",
        "parameterization": "near=D+7, tail=U+7, other arms B+7,C+7; selected full arm=near+tail+1",
        "degrees": [result.degree(v) for v in variables],
        "terms": len(result.terms()),
        "negative_coefficients": negative_count,
        "positive_coefficients": positive_count,
        "minimum_coefficient": str(min(coefficients)),
    }
    output = Path(__file__).with_name("rank8_delta2_e1_arm_all_long_sparse_exact_20260820.json")
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("degrees", payload["degrees"])
    print("terms", payload["terms"])
    print("negative_coefficients", payload["negative_coefficients"])
    print("minimum_coefficient", payload["minimum_coefficient"])
    print("source_sha256", hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper())
    print("report_sha256", hashlib.sha256(output.read_bytes()).hexdigest().upper())


if __name__ == "__main__":
    main()
