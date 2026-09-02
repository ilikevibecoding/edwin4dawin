#!/usr/bin/env python3
"""Reduce the rank-three sibling Theta core to coefficient/edge data."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from derive_sibling_theta_core_recursive_gap import (
    theta_core_polynomial,
)


def main() -> None:
    b3, b4, b5 = sp.symbols("b3 b4 b5")
    j1, j2, j3, j4, r3 = sp.symbols("j1 j2 j3 j4 r3")
    eb3, ej2, ej1 = sp.symbols("eb3 ej2 ej1")

    expression = sp.expand(
        theta_core_polynomial(
            3,
            b3,
            4 * b4,
            4 * b4 + 20 * b5 + 2 * eb3,
            4 * b4 - eb3,
            j3,
            j3 - r3,
            4 * j4 + r3,
            j2,
            3 * j3,
            3 * j3 + 12 * j4 + 2 * ej2,
            3 * j3 - ej2,
            j1,
            2 * j2,
            2 * j2 + 6 * j3 + 2 * ej1,
            2 * j2 - ej1,
        )
    )
    factored = sp.factor(expression)
    report = {
        "status": "PASS_RANK3_SIBLING_THETA_COEFFICIENT_REDUCTION",
        "symbolic_identity": True,
        "expanded_term_count": len(sp.Add.make_args(expression)),
        "expression": str(factored),
        "parameters": {
            "bk": "i_k(B)",
            "jk": "i_k(J), where J=B-v",
            "r3": "i_3(B-N[v])",
            "eb3": "total residual edges over I_3(B)",
            "ej2": "total residual edges over I_2(J)",
            "ej1": "total residual edges over I_1(J)",
        },
        "warning": (
            "This is an exact reduction, not yet a proof that the "
            "displayed rank-three expression is nonnegative."
        ),
    }
    Path(
        "rank3_sibling_theta_core_coefficient_"
        "reduction_20260729.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
