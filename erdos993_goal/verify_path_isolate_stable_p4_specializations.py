#!/usr/bin/env python3
"""Replay stable path-P4 layers 0 through 5 at fixed ranks."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


def remap(expression: str, symbols: dict[str, sp.Symbol]) -> sp.Expr:
    value = sp.sympify(expression)
    return value.subs(
        {
            symbol: symbols[symbol.name]
            for symbol in value.free_symbols
            if symbol.name in symbols
        }
    )


def main() -> None:
    q, length, x = sp.symbols(
        "q L x", integer=True, nonnegative=True
    )
    symbols = {"q": q, "L": length, "x": x}
    fixed = json.loads(
        Path(
            "path_isolate_terminal_fixed_rank_theorem_20260730.json"
        ).read_text(encoding="utf-8")
    )
    by_rank = {
        int(certificate["rank_q"]): certificate
        for certificate in fixed["certificates"]
    }

    checks = []
    for layer in range(6):
        uniform = json.loads(
            Path(
                f"path_isolate_stable_p4_layer_{layer}_20260730.json"
            ).read_text(encoding="utf-8")
        )
        derived = sp.factor(
            sp.combsimp(
                remap(uniform["positive_factor"], symbols)
                * remap(uniform["remainder_in_q_x"], symbols)
            )
        )
        for rank in range(5, 10):
            upper = remap(
                by_rank[rank]["stable_coefficients"][layer + 1][
                    "coefficient_in_L"
                ],
                symbols,
            )
            lower = remap(
                by_rank[rank - 1]["stable_coefficients"][layer][
                    "coefficient_in_L"
                ],
                symbols,
            )
            stored = sp.factor(
                sp.combsimp(
                    (upper - lower).subs(
                        length, 2 * rank - 4 + x
                    )
                )
            )
            specialized = sp.factor(
                sp.combsimp(derived.subs(q, rank))
            )
            difference = sp.factor(
                sp.combsimp(specialized - stored)
            )
            assert difference == 0
            checks.append(
                {
                    "input_layer_j": layer,
                    "rank_q": rank,
                    "difference": "0",
                }
            )

    report = {
        "status": (
            "PASS_PATH_ISOLATE_STABLE_P4_SPECIALIZATION_REPLAY"
        ),
        "input_layers": [0, 1, 2, 3, 4, 5],
        "ranks": [5, 6, 7, 8, 9],
        "exact_formula_checks": len(checks),
        "checks": checks,
    }
    Path(
        "path_isolate_stable_p4_specialization_replay_20260730.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
