#!/usr/bin/env python3
"""Exact zero-slack probe for the four pending low/low auxiliaries.

This proves only the terminal/hard face.  Negative coefficients, if any, are
method obstructions rather than values or tree counterexamples.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_low_low_auxiliaries_zero_slack_exact_20260820.json"
EXPECTED = {
    "analyze_rank8_low_low_double_tail_reduction.py":
        "8B9ADCA8205AF3006F17851B5DD6715A99AF8223CA89395AA3221E15DD387428",
    "rank8_low_low_double_tail_reduction_exact_20260820.json":
        "1DB764EF5B9600A4C69550D26662A3B6C441B709BEC02484465923B9B4C566BC",
    "audit_rank8_low_low_double_tail_reduction.py":
        "4AAD41A2ADE2ABB3B7A350D136905DCA01DBA839DF7B8B6BE63FF1E8B2FB7FBF",
    "rank8_low_low_double_tail_reduction_independent_audit_exact_20260820.json":
        "34F75B0E1185B86AD946988898099ED7A1E93C8A780B4AFBAF03D342FDAA2ABF",
}


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


def statistics(expression: sp.Expr, variables: tuple[sp.Symbol, ...]) -> dict:
    polynomial = sp.Poly(sp.expand(expression), *variables)
    terms = polynomial.terms()
    negatives = [
        {"monomial": list(monomial), "coefficient": int(coefficient)}
        for monomial, coefficient in terms if coefficient < 0
    ]
    coefficients = [int(coefficient) for _, coefficient in terms]
    return {
        "terms": len(terms),
        "negative": len(negatives),
        "minimum": min(coefficients) if coefficients else None,
        "maximum": max(coefficients) if coefficients else None,
        "first_negative": negatives[0] if negatives else None,
        "negative_terms": negatives,
    }


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    h, t, ta, tb = sp.symbols("h t ta tb", nonnegative=True)
    left_ratios, left = factor(ta, [2 * h] + [h] * 7)
    _, right = factor(tb, [2 * h, h - t, h + t] + [h] * 5)
    head = left[:3] + [sp.Integer(0)] * 7
    tail = [sp.Integer(0)] * 3 + left[3:]
    u7, u8, u9 = (convolution(head, right, rank) for rank in (7, 8, 9))
    v7, v8, v9 = (convolution(tail, right, rank) for rank in (7, 8, 9))
    c7, c8, c9 = u7 + v7, u8 + v8, u9 + v9
    base = sp.expand(c8**2 - c7 * c9 - h * c7 * c8)
    derivative = sp.expand(2 * c8 * v8 - v7 * c9 - c7 * v9 - h * (v7 * c8 + c7 * v8))
    curvature = sp.expand(v8**2 - v7 * v9 - h * v7 * v8)
    strong = sp.expand(left_ratios[2] * base + h * derivative)

    rows = []
    for label, expression in (("tail_curvature", curvature), ("strong_payment", strong)):
        poly = sp.Poly(expression, t)
        assert poly.degree() == 2
        p0, p1, p2 = [sp.expand(poly.coeff_monomial(t**degree)) for degree in range(3)]
        bernstein = [p0, sp.expand(p0 + h * p1 / 2), sp.expand(expression.subs(t, h))]
        # Clear the middle denominator only; all variables are nonnegative.
        cleared = [bernstein[0], sp.expand(2 * bernstein[1]), bernstein[2]]
        rows.append({
            "auxiliary": label,
            "bernstein_statistics": [
                statistics(value, (h, ta, tb)) for value in cleared
            ],
            "middle_clearing_factor": 2,
        })

    payload = {
        "schema": "rank8-low-low-auxiliaries-zero-slack-v1",
        "status": (
            "PASS_EXACT_ZERO_SLACK_LOW_LOW_AUXILIARIES"
            if all(item["negative"] == 0 for row in rows for item in row["bernstein_statistics"])
            else "ZERO_SLACK_COEFFICIENT_OBSTRUCTION_NOT_VALUE_COUNTEREXAMPLE"
        ),
        "face": "all adjusted-gap slacks zero; variables h,ta,tb nonnegative",
        "rows": rows,
        "scope_warning": (
            "This report covers only the zero-slack terminal face and cannot by "
            "itself prove or disprove the low/low cone or Problem 993."
        ),
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    for row in rows:
        print(row["auxiliary"], row["bernstein_statistics"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
