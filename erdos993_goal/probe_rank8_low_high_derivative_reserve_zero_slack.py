#!/usr/bin/env python3
"""Exact zero-slack probe for the missing low/high derivative reserve.

The required reserve is R=d+(7!8!)*C*p1*p2*K_q(1,2), written below in the
ordinary binomial-convolution normalization as d+C*p1*p2*(196q6^2-168q5q7).
This file covers only the terminal face and makes no full-cone claim.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_low_high_derivative_reserve_zero_slack_exact_20260820.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def factor(terminal: sp.Expr, gaps: list[sp.Expr]) -> tuple[list[sp.Expr], list[sp.Expr]]:
    ratios = [sp.Integer(0)] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = sp.expand(ratios[index + 1] + gaps[index])
    coefficients = [sp.Integer(1)]
    for ratio in ratios:
        coefficients.append(sp.expand(coefficients[-1] * ratio))
    return ratios, coefficients


def convolution(left: list[sp.Expr], right: list[sp.Expr], rank: int) -> sp.Expr:
    return sp.expand(sum(
        math.comb(rank, index) * left[index] * right[rank - index]
        for index in range(rank + 1)
    ))


def main() -> None:
    h, ta, tb = sp.symbols("h ta tb", nonnegative=True)
    left_ratios, left = factor(ta, [2 * h] + [h] * 7)
    _, right = factor(tb, [2 * h] + [h] * 7)
    tail = [sp.Integer(0)] * 3 + left[3:]
    c7, c8, c9 = (convolution(left, right, rank) for rank in (7, 8, 9))
    v7, v8, v9 = (convolution(tail, right, rank) for rank in (7, 8, 9))
    derivative = sp.expand(
        2 * c8 * v8 - v7 * c9 - c7 * v9 - h * (v7 * c8 + c7 * v8)
    )
    kernel = sp.expand(196 * right[6] ** 2 - 168 * right[5] * right[7])
    reserve = sp.expand(derivative + left_ratios[2] * left[1] * left[2] * kernel)
    polynomial = sp.Poly(reserve, h, ta, tb)
    negatives = [
        {"monomial": list(monomial), "coefficient": int(coefficient)}
        for monomial, coefficient in polynomial.terms() if coefficient < 0
    ]
    coefficients = [int(coefficient) for coefficient in polynomial.coeffs()]
    payload = {
        "schema": "rank8-low-high-derivative-reserve-zero-slack-v1",
        "status": (
            "PASS_EXACT_DERIVATIVE_RESERVE_ZERO_SLACK"
            if not negatives
            else "ZERO_SLACK_COEFFICIENT_OBSTRUCTION_NOT_VALUE_COUNTEREXAMPLE"
        ),
        "identity": "R=d+C*p1*p2*(196*q6^2-168*q5*q7)",
        "statistics": {
            "terms": len(coefficients),
            "negative": len(negatives),
            "minimum": min(coefficients),
            "maximum": max(coefficients),
            "negative_terms": negatives,
        },
        "scope_warning": (
            "Only the zero-slack terminal face is checked.  This is not the "
            "missing full-cone derivative-reserve theorem."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print(payload["statistics"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
