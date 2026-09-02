#!/usr/bin/env python3
"""Exact structural audit for the order-27 leaf-support Delta0 frontier."""

from __future__ import annotations

import json
from math import comb
from pathlib import Path

import sympy as sp

from enumerate_rank7_leaf_boundary_frontier import balanced_completion
from verify_rank7_terminal_broom_reduction import c, exact_decomposition, h, newton_coefficients
from verify_rank7_terminal_broom_rooted_c4_moment import partitions


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank7_delta0_leaf_boundary_frontier_n27_exact_20260820.json"


def all_rows(n: int, b2_floor: int):
    rows = set()
    witnesses = {}
    for leaves in range(2, n - 1):
        internal = n - leaves
        for part in partitions(leaves, leaves):
            part = tuple(part)
            supports = len(part)
            if supports < 2 or supports > internal:
                continue
            lower = part + (1,) * (internal - supports)
            excess = balanced_completion(lower, n - 2)
            raw_beta = sum(comb(value, 2) for value in excess)
            beta = max(b2_floor, raw_beta)
            boundary_one = sum(comb(value, 5) for value in part)
            pair = (beta, boundary_one)
            rows.add(pair)
            witnesses.setdefault(
                pair,
                {
                    "leaves": leaves,
                    "leaf_support_partition": list(part),
                    "balanced_excess_partition": list(excess),
                    "raw_B2_lower": raw_beta,
                },
            )
    return rows, witnesses


def frontier(rows):
    result = []
    for beta, boundary_one in sorted(rows):
        if any(
            other_beta <= beta
            and other_boundary >= boundary_one
            and (other_beta, other_boundary) != (beta, boundary_one)
            for other_beta, other_boundary in rows
        ):
            continue
        result.append((beta, boundary_one))
    return result


def star_delta0(n: int):
    raw = newton_coefficients(exact_decomposition())[0]
    coefficients = [1, n] + [comb(n - 1, rank) for rank in range(2, 8)]
    values = {}
    for root_type, h5, h6 in (
        ("center", comb(n - 1, 5), comb(n - 1, 6)),
        ("leaf", comb(n - 2, 5), comb(n - 2, 6)),
    ):
        value = sp.expand(
            raw.subs(
                dict(zip((*c[:8], h[5], h[6]), (*coefficients, h5, h6))),
                simultaneous=True,
            )
        )
        assert value > 0
        values[root_type] = int(value)
    return values


def main() -> int:
    n = 27
    b2_floor = 6
    rows, witnesses = all_rows(n, b2_floor)
    boundary = frontier(rows)
    assert len(boundary) == 35
    assert boundary[0] == (6, 0)
    assert boundary[-1] == (276, 42504)
    # Every leaf-support row is dominated by at least one retained worst row.
    for beta, boundary_one in rows:
        assert any(
            retained_beta <= beta and retained_boundary >= boundary_one
            for retained_beta, retained_boundary in boundary
        )

    # Symbolic form of the two linked inequalities used by each exact box.
    n_symbol, c5, c6, l5 = sp.symbols("n c5 c6 l5", positive=True)
    extension_defect = (n_symbol - 6) * c5 - 6 * c6
    coupled_lower = c5 - l5
    solved_upper = sp.factor((n_symbol - 7) * c5 / 6 + l5 / 6)
    assert sp.factor(
        extension_defect.subs(c6, solved_upper) - coupled_lower
    ) == 0

    report = {
        "status": "PASS_EXACT_ORDER27_LEAF_BOUNDARY_FRONTIER_STRUCTURE",
        "order": n,
        "scope": "nonstar trees with B2>=6; the star is checked separately",
        "structural_rows": len(rows),
        "frontier_rows": len(boundary),
        "frontier": [
            {
                "B2_lower": beta,
                "boundary_one_upper": boundary_one,
                "witness": witnesses[(beta, boundary_one)],
            }
            for beta, boundary_one in boundary
        ],
        "coupling": {
            "identity": "(n-6)c5-6c6=sum_{S in I5}(|N(S)|-1)",
            "boundary_one_characterization": "|N(S)|=1 iff S is five leaves with one common support",
            "consequence": "6c6<=(n-7)c5+L5, hence c5/c6>=6/(n-7+L5/c5)",
        },
        "star_Delta0": star_delta0(n),
    }
    OUTPUT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(report["status"])
    print("frontier_rows", len(boundary))
    print("star_Delta0", report["star_Delta0"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
