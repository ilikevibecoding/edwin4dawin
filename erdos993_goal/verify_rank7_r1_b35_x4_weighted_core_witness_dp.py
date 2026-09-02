#!/usr/bin/env python3
"""Independent exact DP audit of the B35/x4 weighted-core witness tree."""
from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from verify_rank7_terminal_broom_reduction import (
    c,
    h,
    exact_decomposition,
    newton_coefficients,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "rank7_r1_b35_x4_weighted_core_witness_dp_exact_20260817.json"


def multiply(left: list[int], right: list[int], limit: int) -> list[int]:
    out = [0] * (min(limit, len(left) + len(right) - 2) + 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            if i + j <= limit:
                out[i + j] += a * b
    return out


def add(left: list[int], right: list[int], limit: int) -> list[int]:
    return [
        (left[i] if i < len(left) else 0) + (right[i] if i < len(right) else 0)
        for i in range(min(limit, max(len(left), len(right)) - 1) + 1)
    ]


def independence_polynomial(adjacency: list[set[int]], deleted: set[int], limit: int) -> list[int]:
    seen: set[int] = set()

    def visit(vertex: int, parent: int) -> tuple[list[int], list[int]]:
        seen.add(vertex)
        excluded = [1]
        included = [0, 1]
        for child in adjacency[vertex]:
            if child == parent or child in deleted:
                continue
            child0, child1 = visit(child, vertex)
            excluded = multiply(excluded, add(child0, child1, limit), limit)
            included = multiply(included, child0, limit)
        return excluded, included

    total = [1]
    for vertex in range(len(adjacency)):
        if vertex in deleted or vertex in seen:
            continue
        part0, part1 = visit(vertex, -1)
        total = multiply(total, add(part0, part1, limit), limit)
    total += [0] * (limit + 1 - len(total))
    return total[: limit + 1]


def main() -> int:
    row = json.loads(
        (HERE / "rank7_r1_high_correlation_bulk_b30plus_exact_20260817.json")
        .read_text(encoding="utf-8")
    )["profiles"]["B2=35,x=4"]["c4_rows"]["5331"]
    weights = row["weights_by_vertex"]
    core_edges = [tuple(edge) for edge in row["core_edges"]]
    leaf_slots = row["leaf_slots"]
    adjacency = [set() for _ in range(len(weights) + sum(leaf_slots))]
    for u, v in core_edges:
        adjacency[u].add(v)
        adjacency[v].add(u)
    next_vertex = len(weights)
    root = None
    for vertex, count in enumerate(leaf_slots):
        for _ in range(count):
            leaf = next_vertex
            next_vertex += 1
            adjacency[vertex].add(leaf)
            adjacency[leaf].add(vertex)
            if root is None and weights[vertex] == 4:
                root = leaf
    assert next_vertex == 23 and root is not None

    core_poly = independence_polynomial(adjacency, set(), 7)
    h_poly = independence_polynomial(adjacency, {root}, 7)
    assert core_poly[:6] == [1, 23, 231, 1365, 5331, 14568]
    assert core_poly[5] == row["c5_min"]

    raw = newton_coefficients(exact_decomposition())
    substitutions = {
        c[index]: sp.Integer(core_poly[index]) for index in range(8)
    }
    substitutions.update({h[5]: sp.Integer(h_poly[5]), h[6]: sp.Integer(h_poly[6])})
    deltas = [sp.factor(value.subs(substitutions, simultaneous=True)) for value in raw]
    assert all(value > 0 for value in deltas)
    report = {
        "status": "PASS_EXACT_WEIGHTED_CORE_WITNESS_DP",
        "warning": "This audits one witness tree; it is not the full bulk census.",
        "root": root,
        "independence_coefficients_A_0_to_7": core_poly,
        "independence_coefficients_H_0_to_7": h_poly,
        "terminal_residual_coefficients_0_to_13": [str(value) for value in deltas],
        "target_Delta0_to_Delta6": [str(value) for value in deltas[:7]],
        "minimum_delta": str(min(deltas)),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
