#!/usr/bin/env python3
"""Assemble and independently replay the exact all-root C7 order-23 census."""

from __future__ import annotations

import ast
import hashlib
import json
from pathlib import Path
import re


HERE = Path(__file__).resolve().parent
PRIMARY = HERE / "rank7_rooted_cross_order23_exact_20260820.log"
FRESH = HERE / "rank7_rooted_cross_order23_fresh_replay_20260820.log"
OUTPUT = HERE / "rank7_rooted_cross_order23_exact_20260820.json"
SOURCE = HERE / "verify_rank7_rooted_cross_order23.rs"

ROW = re.compile(
    r"^order=(?P<n>\d+) trees=(?P<trees>\d+) rooted_checks=(?P<roots>\d+) "
    r"negative=(?P<negative>\d+) minimum=(?P<minimum>\d+) "
    r"witness_root=(?P<root>\d+) witness_degree=(?P<degree>\d+) "
    r"witness_B2=(?P<b2>\d+) witness_layout=(?P<layout>\[.*?\]) "
    r"polynomial=(?P<poly>\[.*?\]) deletion=(?P<deletion>\[.*?\])$"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def parse(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    assert text.endswith("PASS_EXACT_RANK7_ROOTED_CROSS_ALL_ROOTS_ORDER_23\n")
    match = next((ROW.match(line) for line in text.splitlines() if ROW.match(line)), None)
    assert match is not None
    row = match.groupdict()
    return {
        "order": int(row["n"]),
        "free_trees": int(row["trees"]),
        "rooted_checks": int(row["roots"]),
        "negative": int(row["negative"]),
        "minimum_C7": int(row["minimum"]),
        "root": int(row["root"]),
        "root_degree": int(row["degree"]),
        "B2": int(row["b2"]),
        "layout": ast.literal_eval(row["layout"]),
        "polynomial": ast.literal_eval(row["poly"]),
        "deletion": ast.literal_eval(row["deletion"]),
    }


def adjacency(layout: list[int]) -> list[list[int]]:
    graph = [[] for _ in layout]
    stack: list[int] = []
    for vertex, level in enumerate(layout):
        if stack:
            while layout[stack[-1]] >= level:
                stack.pop()
            parent = stack[-1]
            graph[vertex].append(parent)
            graph[parent].append(vertex)
        stack.append(vertex)
    return graph


def poly_mul(left: list[int], right: list[int], degree: int = 7) -> list[int]:
    output = [0] * (degree + 1)
    for i, x in enumerate(left):
        for j, y in enumerate(right):
            if i + j <= degree:
                output[i + j] += x * y
    return output


def rooted_state(graph: list[list[int]], vertex: int, parent: int) -> tuple[list[int], list[int]]:
    excluded = [1] + [0] * 7
    included = [0, 1] + [0] * 6
    for child in graph[vertex]:
        if child == parent:
            continue
        child_excluded, child_included = rooted_state(graph, child, vertex)
        excluded = poly_mul(excluded, [x + y for x, y in zip(child_excluded, child_included)])
        included = poly_mul(included, child_excluded)
    return excluded, included


def main() -> int:
    primary = parse(PRIMARY)
    fresh = parse(FRESH)
    assert primary == fresh
    assert (primary["order"], primary["free_trees"], primary["rooted_checks"]) == (
        23, 14_828_074, 341_045_702
    )
    assert primary["negative"] == 0
    assert primary["minimum_C7"] == 679_432_265_658

    graph = adjacency(primary["layout"])
    assert sum(map(len, graph)) == 44
    assert primary["root_degree"] == len(graph[primary["root"]]) == 1
    b2 = sum(max(len(neighbors) - 1, 0) * max(len(neighbors) - 2, 0) // 2 for neighbors in graph)
    assert b2 == primary["B2"] == 3
    excluded, included = rooted_state(graph, 0, -1)
    polynomial = [x + y for x, y in zip(excluded, included)]
    assert polynomial == primary["polynomial"]
    deletion = [1] + [0] * 7
    root = primary["root"]
    for neighbor in graph[root]:
        ex, inc = rooted_state(graph, neighbor, root)
        deletion = poly_mul(deletion, [x + y for x, y in zip(ex, inc)])
    assert deletion == primary["deletion"]
    d, e, f = polynomial[5:8]
    h, k = deletion[5:7]
    value = d * (e * e - d * f) - 2 * e * (e * h - d * k)
    assert value == primary["minimum_C7"]

    report = {
        "status": "PASS_FRESH_REPLAY_EXACT_RANK7_ROOTED_C7_ALL_ROOTS_ORDER_23",
        "statement": "C7=i5*(i6^2-i5*i7)-2*i6*(i6*h5-i5*h6)>0",
        "coverage": {
            "order": 23,
            "free_trees": primary["free_trees"],
            "rooted_checks": primary["rooted_checks"],
            "negative": 0,
            "minimum_C7": primary["minimum_C7"],
        },
        "minimum_witness": {
            "root": root,
            "root_degree": primary["root_degree"],
            "B2": b2,
            "WROM_layout": primary["layout"],
            "independence_coefficients_i0_through_i7": polynomial,
            "root_deleted_coefficients_i0_through_i7": deletion,
        },
        "fresh_replay_matches_primary": True,
        "independent_witness_reconstruction": True,
        "artifacts": {
            path.name: sha256(path)
            for path in (SOURCE, PRIMARY, FRESH, Path(__file__).resolve())
        },
        "scope_warning": "This is an exhaustive theorem only for order 23, not the remaining orders 24 through 38.",
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(f"wrote {OUTPUT.name}; sha256={sha256(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
