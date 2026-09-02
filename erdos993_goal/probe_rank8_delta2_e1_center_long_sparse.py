#!/usr/bin/env python3
"""Sparse exact coefficient test for the all-long center-rooted e=1 cell."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_rank8_delta2_e1_symbolic_cell import claw_count, product_path_count
from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


def main() -> None:
    A, B, C = sp.symbols("A B C", integer=True, nonnegative=True)
    variables = (A, B, C)
    arms = (A + 7, B + 7, C + 7)
    values = {
        **{c[k]: sp.Poly(claw_count(arms, k), *variables) for k in range(4, 9)},
        **{h[k]: sp.Poly(product_path_count(arms, k), *variables) for k in (6, 7)},
    }
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
        "cell": "e=1 root=center all arms>=7",
        "parameterization": "arms=(A+7,B+7,C+7), A,B,C>=0",
        "degrees": [result.degree(v) for v in variables],
        "terms": len(result.terms()),
        "negative_coefficients": negative_count,
        "positive_coefficients": positive_count,
        "minimum_coefficient": str(min(coefficients)),
    }
    output = Path(__file__).with_name("rank8_delta2_e1_center_long_sparse_exact_20260820.json")
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
