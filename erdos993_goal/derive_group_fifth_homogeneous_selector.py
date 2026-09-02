#!/usr/bin/env python3
"""Derive the degree-four Newton selector for homogeneous deficit s=4."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "group_fifth_homogeneous_selector_20260804.json"


def choose_fixed(top: sp.Expr, bottom: int) -> sp.Expr:
    if bottom < 0:
        return sp.S.Zero
    return sp.prod(top - h for h in range(bottom)) / sp.factorial(bottom)


def derive() -> list[sp.Expr]:
    s = 4
    p, alpha = sp.symbols("p alpha", integer=True, positive=True)
    N = p + alpha
    values = []
    for j in range(5):
        defect = sp.S.Zero
        for deletion, sign in enumerate((1, -2, 1)):
            M = N - deletion
            for i in range(s + 1):
                defect += (
                    sign
                    * choose_fixed(2 * M - i - 1, i)
                    * choose_fixed(2 * M - s + i - 1, s - i)
                    * choose_fixed(
                        p - s - 2 * deletion,
                        i + j - s - deletion,
                    )
                )
        values.append(sp.cancel(defect / choose_fixed(p, j)))

    nodes = [j * (p - j) for j in range(5)]
    coefficients: list[sp.Expr] = []
    for j in range(5):
        remainder = values[j] - sum(
            coefficients[h] * sp.prod(nodes[j] - nodes[k] for k in range(h))
            for h in range(j)
        )
        coefficients.append(
            sp.factor(
                sp.cancel(
                    remainder
                    / sp.prod(nodes[j] - nodes[k] for k in range(j))
                )
            )
        )
    return coefficients


def main() -> None:
    coefficients = derive()
    report = {
        "status": "EXACT_SELECTOR_DERIVATION",
        "layer_deficit": 4,
        "newton_degree": len(coefficients) - 1,
        "coefficients": list(map(str, coefficients)),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    for index, coefficient in enumerate(coefficients):
        print(f"c{index} = {coefficient}", flush=True)
    print(REPORT)


if __name__ == "__main__":
    main()
