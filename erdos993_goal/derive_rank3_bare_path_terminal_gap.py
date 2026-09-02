#!/usr/bin/env python3
"""Prove the actual rank-three bare-path terminal increment."""

from __future__ import annotations

import json
from pathlib import Path

import networkx as nx
import sympy as sp

from derive_bare_path_terminal_phase_gap import symbolic_path_blocks
from scan_sibling_theta_core_pruning import theta_core


def direct_factorial_increment(length: int) -> int:
    base = nx.path_graph(length + 1)
    distinguished = length + 1
    old = base.copy()
    old.add_edge(0, distinguished)
    new_leaf = length + 2
    full = old.copy()
    full.add_edge(length, new_leaf)
    return (
        theta_core(full, 0, distinguished).get(3, 0)
        - theta_core(old, 0, distinguished).get(3, 0)
    )


def main() -> None:
    length, q, old, _, new = symbolic_path_blocks()
    factorial_increment = sp.factor(
        sp.combsimp(
            sp.factorial(3) ** 2
            * sum(new[name] - old[name] for name in old).subs(q, 3)
            / 2
        )
    )
    expected = 24 * (
        2 * length**3 - 18 * length**2 + 85 * length - 87
    )
    assert sp.expand(factorial_increment - expected) == 0

    x = sp.symbols("x", integer=True, nonnegative=True)
    shifted_cubic = sp.expand(
        (expected / 24).subs(length, x + 3)
    )
    assert shifted_cubic == 2 * x**3 + 31 * x + 60

    boundary = {
        str(value): direct_factorial_increment(value)
        for value in (1, 2)
    }
    assert boundary == {"1": 0, "2": 288}
    replay = []
    for value in range(3, 31):
        direct = direct_factorial_increment(value)
        formula = int(expected.subs(length, value))
        assert direct == formula
        replay.append(
            {
                "path_length": value,
                "factorial_increment": direct,
            }
        )

    report = {
        "status": "PASS_RANK3_BARE_PATH_TERMINAL_GAP_THEOREM",
        "quantity": "3!^2 times the actual rank-three increment",
        "valid_formula_range": "L>=3",
        "factored_formula": str(factorial_increment),
        "shift": "x=L-3",
        "shifted_cubic": str(shifted_cubic),
        "boundary_values": boundary,
        "replayed_path_lengths": "3..30",
        "replay_count": len(replay),
        "proof_summary": (
            "For L>=3 the increment is "
            "24(2(L-3)^3+31(L-3)+60)>0. The two shorter "
            "paths have exact increments 0 and 288."
        ),
    }
    Path(
        "rank3_bare_path_terminal_gap_theorem_20260729.json"
    ).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
