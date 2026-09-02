#!/usr/bin/env python3
"""Exact obstructions to stratum-local ISO switching payments.

For fixed k, split all three terms in

    p_k^2 + (k+1)p_(k+1)^2 - (k+2)p_k p_(k+2)

by either the intersection size or the union size of the ordered pair.  The
total is the ISO reserve, but the individual strata need not be nonnegative,
even for a star.  Hence a switching proof must transport capacity between
different intersection/union strata.
"""

from __future__ import annotations

import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path

import networkx as nx


def independent_rows(graph: nx.Graph) -> list[list[int]]:
    graph = nx.convert_node_labels_to_integers(graph)
    n = graph.number_of_nodes()
    edges = [(1 << u) | (1 << v) for u, v in graph.edges()]
    rows = [[] for _ in range(n + 1)]
    for mask in range(1 << n):
        if all(mask & edge != edge for edge in edges):
            rows[mask.bit_count()].append(mask)
    return rows


def stratified_reserve(
    rows: list[list[int]], k: int, statistic: str
) -> dict[int, dict[str, int]]:
    if statistic not in {"intersection", "union"}:
        raise ValueError(statistic)

    def key(left: int, right: int) -> int:
        mask = left & right if statistic == "intersection" else left | right
        return mask.bit_count()

    parts: defaultdict[int, Counter[str]] = defaultdict(Counter)
    for left in rows[k]:
        for right in rows[k]:
            parts[key(left, right)]["dummy_pairs"] += 1
    for left in rows[k + 1]:
        for right in rows[k + 1]:
            parts[key(left, right)]["balanced_pairs"] += 1
    for left in rows[k]:
        for right in rows[k + 2]:
            parts[key(left, right)]["unbalanced_pairs"] += 1

    result = {}
    for stratum, counts in sorted(parts.items()):
        reserve = (
            counts["dummy_pairs"]
            + (k + 1) * counts["balanced_pairs"]
            - (k + 2) * counts["unbalanced_pairs"]
        )
        result[stratum] = {
            "dummy_pairs": counts["dummy_pairs"],
            "balanced_pairs": counts["balanced_pairs"],
            "unbalanced_pairs": counts["unbalanced_pairs"],
            "reserve": reserve,
        }
    return result


def audit_star(leaves: int, k: int) -> dict:
    graph = nx.star_graph(leaves)
    rows = independent_rows(graph)
    p = [len(row) for row in rows]
    iso = p[k] ** 2 + (k + 1) * p[k + 1] ** 2 - (k + 2) * p[k] * p[k + 2]
    by_intersection = stratified_reserve(rows, k, "intersection")
    by_union = stratified_reserve(rows, k, "union")
    assert sum(cell["reserve"] for cell in by_intersection.values()) == iso
    assert sum(cell["reserve"] for cell in by_union.values()) == iso
    return {
        "tree": f"K_1_{leaves}",
        "order": leaves + 1,
        "rank_k": k,
        "independence_coefficients": p,
        "iso_reserve": iso,
        "intersection_strata": by_intersection,
        "union_strata": by_union,
    }


def main() -> None:
    star6 = audit_star(6, 1)
    assert star6["independence_coefficients"][:7] == [1, 7, 15, 20, 15, 6, 1]
    assert star6["iso_reserve"] == 79
    assert star6["intersection_strata"][0] == {
        "dummy_pairs": 42,
        "balanced_pairs": 90,
        "unbalanced_pairs": 80,
        "reserve": -18,
    }

    star3 = audit_star(3, 1)
    assert star3["iso_reserve"] > 0
    assert star3["union_strata"][4] == {
        "dummy_pairs": 0,
        "balanced_pairs": 0,
        "unbalanced_pairs": 1,
        "reserve": -3,
    }

    source = Path(__file__).read_bytes()
    report = {
        "marker": "PASS_EXACT_ISO_STRATUM_LOCAL_PAYMENT_OBSTRUCTION",
        "scope": (
            "Exact counterexamples only to intersection-size-local and "
            "union-size-local switching payments; forest ISO remains open."
        ),
        "identity": (
            "sum_strata[dummy+(k+1)balanced-(k+2)unbalanced]="
            "p_k^2+(k+1)p_(k+1)^2-(k+2)p_k p_(k+2)"
        ),
        "witnesses": [star6, star3],
        "source_sha256": hashlib.sha256(source).hexdigest().upper(),
    }
    output = Path("iso_intersection_stratum_payment_obstruction_exact_agent_20260829.json")
    output.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
