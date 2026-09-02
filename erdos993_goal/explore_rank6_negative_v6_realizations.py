#!/usr/bin/env python3
"""Classify connected realizations of the twelve negative-V6 forest rows."""

from __future__ import annotations

import json
from pathlib import Path

import networkx as nx
from flint import fmpz_poly as Poly

from scan_forest_iso_reserve_floor import tree_polynomial


ROOT = Path(__file__).resolve().parent


def multiply(parts: list[tuple[int, ...]]) -> tuple[int, ...]:
    value = Poly([1])
    for part in parts:
        value *= Poly(list(part))
    return tuple(int(x) for x in value)


def deleted_polynomial(tree: nx.Graph, vertex: int) -> tuple[int, ...]:
    remaining = tree.copy()
    remaining.remove_node(vertex)
    pieces = []
    for vertices in nx.connected_components(remaining):
        component = remaining.subgraph(vertices).copy()
        if len(component) == 1:
            pieces.append((1, 1))
        else:
            component = nx.convert_node_labels_to_integers(component)
            pieces.append(tree_polynomial(component))
    return multiply(pieces)


def coeff(poly: tuple[int, ...], k: int) -> int:
    return poly[k] if k < len(poly) else 0


def coupled_margin(b: tuple[int, ...], c: tuple[int, ...]) -> int:
    # Cleared form of H6(P)-H5(B), with P=(1+x)B+xC.
    p = [0] * max(len(b) + 1, len(c) + 1)
    for j, value in enumerate(b):
        p[j] += value
        p[j + 1] += value
    for j, value in enumerate(c):
        p[j + 1] += value
    b4, b5, b6 = (coeff(b, j) for j in (4, 5, 6))
    p5, p6, p7 = (coeff(tuple(p), j) for j in (5, 6, 7))
    q6 = 12 * p6 * p6 - p5 * p6 - 14 * p5 * p7
    v6 = 4 * b4 * b5 + 39 * b4 * b6 - 25 * b5 * b5
    c5 = coeff(c, 5)
    return 3 * b4 * q6 + 9 * c5 * p5 * b4 + v6 * p5


def main() -> None:
    source = json.loads((ROOT / "forest_v6_alpha10_exact_20260813.json").read_text())
    records = source["finite_order_at_most_20"]["alpha9_negative"]
    targets = {tuple(item[1]) for item in records}
    found: dict[tuple[int, ...], dict[str, object]] = {
        target: {"trees": 0, "deletions": set(), "minimum": None}
        for target in targets
    }
    for order in (16, 17):
        for index, tree in enumerate(nx.nonisomorphic_trees(order), 1):
            full = tree_polynomial(tree)
            if full not in targets:
                continue
            item = found[full]
            item["trees"] = int(item["trees"]) + 1
            for vertex in tree:
                deletion = deleted_polynomial(tree, vertex)
                item["deletions"].add(deletion)
                margin = coupled_margin(full, deletion)
                minimum = item["minimum"]
                if minimum is None or margin < minimum[0]:
                    item["minimum"] = (margin, deletion, order, index, vertex)
        print("finished", order, flush=True)
    output = []
    for target in sorted(targets):
        item = found[target]
        output.append({
            "B": list(target),
            "tree_realizations": item["trees"],
            "distinct_vertex_deletions": len(item["deletions"]),
            "minimum": list(item["minimum"]) if item["minimum"] else None,
        })
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
