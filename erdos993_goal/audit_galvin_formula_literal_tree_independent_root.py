#!/usr/bin/env python3
"""Independent literal-tree audit of the Galvin-family search formula."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

from flint import fmpz_poly

from search_galvin_standard_tree_factor_counterexample_root import (
    galvin_polynomial,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "galvin_formula_literal_tree_independent_audit_root_20260827.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def add_edge(adjacency: list[list[int]], first: int, second: int) -> None:
    adjacency[first].append(second)
    adjacency[second].append(first)


def literal_galvin_tree(m: int, t: int) -> list[list[int]]:
    order = 1 + m + 2 * m * t
    adjacency = [[] for _ in range(order)]
    for branch in range(m):
        center = 1 + branch
        add_edge(adjacency, 0, center)
        for arm in range(t):
            middle = 1 + m + branch * t + arm
            leaf = 1 + m + m * t + branch * t + arm
            add_edge(adjacency, center, middle)
            add_edge(adjacency, middle, leaf)
    return adjacency


def rooted_states(
    adjacency: list[list[int]],
    vertex: int,
    parent: int,
) -> tuple[fmpz_poly, fmpz_poly]:
    excluded = fmpz_poly([1])
    included = fmpz_poly([0, 1])
    for child in adjacency[vertex]:
        if child == parent:
            continue
        child_excluded, child_included = rooted_states(
            adjacency, child, vertex
        )
        excluded *= child_excluded + child_included
        included *= child_excluded
    return excluded, included


def literal_independence_polynomial(adjacency: list[list[int]]) -> list[int]:
    excluded, included = rooted_states(adjacency, 0, -1)
    polynomial = excluded + included
    return [int(polynomial[index]) for index in range(len(polynomial))]


def main() -> int:
    cases = [
        *( (m, t) for m in range(1, 7) for t in range(1, 7) ),
        (21, 11),
        (3, 50),
        (4, 49),
    ]
    rows = []
    for m, t in cases:
        adjacency = literal_galvin_tree(m, t)
        order, formula = galvin_polynomial(m, t)
        literal = literal_independence_polynomial(adjacency)
        assert order == len(adjacency)
        assert formula == literal, (m, t)
        rows.append({
            "m": m,
            "t": t,
            "order": order,
            "independence_number": len(literal) - 1,
            "coefficient_sha256": hashlib.sha256(
                json.dumps(literal, separators=(",", ":")).encode("ascii")
            ).hexdigest().upper(),
        })

    payload = {
        "schema": "galvin-formula-literal-tree-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_EXACT_LITERAL_TREE_GALVIN_FORMULA_AUDIT",
        "cases": rows,
        "case_count": len(rows),
        "literal_tree_builder_and_rooted_dp": True,
        "producer_source_sha256": sha256(
            HERE / "search_galvin_standard_tree_factor_counterexample_root.py"
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"], flush=True)
    print("REPORT", sha256(OUTPUT), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
