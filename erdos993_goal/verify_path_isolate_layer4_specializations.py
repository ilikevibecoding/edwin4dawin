#!/usr/bin/env python3
"""Replay the all-rank layer-four formula at ranks 4 through 9."""

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
    q, length, x, r = sp.symbols(
        "q L x r", integer=True, nonnegative=True
    )
    symbols = {"q": q, "L": length, "x": x, "r": r}
    uniform = json.loads(
        Path(
            "path_isolate_layer_4_direct_20260730.json"
        ).read_text(encoding="utf-8")
    )
    fixed = json.loads(
        Path(
            "path_isolate_terminal_fixed_rank_theorem_20260730.json"
        ).read_text(encoding="utf-8")
    )
    positive_factor = remap(uniform["positive_factor"], symbols)
    remainder = remap(uniform["remainder_in_q_x"], symbols)
    uniform_shifted = sp.factor(
        sp.combsimp(positive_factor * remainder)
    )

    checks = []
    for certificate in fixed["certificates"]:
        rank = int(certificate["rank_q"])
        stored = remap(
            certificate["stable_coefficients"][4][
                "coefficient_in_L"
            ],
            symbols,
        )
        stored_shifted = sp.factor(
            sp.combsimp(
                stored.subs(
                    {
                        q: rank,
                        length: 2 * rank - 4 + x,
                    }
                )
            )
        )
        derived = sp.factor(
            sp.combsimp(uniform_shifted.subs(q, rank))
        )
        difference = sp.factor(
            sp.combsimp(derived - stored_shifted)
        )
        assert difference == 0
        checks.append(
            {
                "rank_q": rank,
                "difference": "0",
            }
        )

    report = {
        "status": "PASS_PATH_ISOLATE_LAYER4_SPECIALIZATION_REPLAY",
        "uniform_layer": 4,
        "replayed_ranks": [item["rank_q"] for item in checks],
        "checks": checks,
    }
    Path(
        "path_isolate_layer4_specialization_replay_20260730.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
