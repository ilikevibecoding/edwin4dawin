#!/usr/bin/env python3
"""Explore maximal-independent-set deficit counts in finite forests.

For a forest G with independence number alpha, a closed Hall boundary at
operative excess e corresponds to a maximal independent set B of size
alpha-e.  The pointed residue counts those B containing p, with a fixed
maximum set avoiding p and an additional private-neighbor restriction.

This script first records the coarser all-maximal and pointed-maximal counts
by (alpha,e), to identify plausible extremal recurrences.  It is finite
evidence only.
"""

from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from math import comb
from pathlib import Path

import networkx as nx


def independent(graph: nx.Graph, mask: int) -> bool:
    return all(not ((mask >> u) & 1 and (mask >> v) & 1) for u, v in graph.edges())


def maximal(graph: nx.Graph, mask: int, full: int) -> bool:
    outside = full ^ mask
    while outside:
        bit = outside & -outside
        vertex = bit.bit_length() - 1
        if all(not (mask >> neighbor) & 1 for neighbor in graph[vertex]):
            return False
        outside ^= bit
    return True


def main() -> None:
    all_extrema: dict[tuple[int, int], dict] = {}
    pointed_extrema: dict[tuple[int, int], dict] = {}
    graphs = rows = 0
    stream = hashlib.sha256()

    for graph0 in nx.graph_atlas_g():
        if not graph0 or not nx.is_forest(graph0):
            continue
        graph = nx.convert_node_labels_to_integers(graph0, ordering="sorted")
        n = len(graph)
        full = (1 << n) - 1
        independent_masks = [mask for mask in range(1 << n) if independent(graph, mask)]
        alpha = max(mask.bit_count() for mask in independent_masks)
        maxima = [mask for mask in independent_masks if mask.bit_count() == alpha]
        maximal_masks = [mask for mask in independent_masks if maximal(graph, mask, full)]
        graphs += 1

        by_deficit: dict[int, list[int]] = defaultdict(list)
        for mask in maximal_masks:
            by_deficit[alpha - mask.bit_count()].append(mask)
        for deficit, masks in sorted(by_deficit.items()):
            if deficit <= 0:
                continue
            key = (alpha, deficit)
            record = {
                "order": n,
                "components": nx.number_connected_components(graph),
                "alpha": alpha,
                "deficit": deficit,
                "count": len(masks),
                "capacity": deficit * comb(alpha, deficit),
                "edges": sorted(tuple(sorted(edge)) for edge in graph.edges()),
            }
            if key not in all_extrema or record["count"] > all_extrema[key]["count"]:
                all_extrema[key] = record
            for point in graph:
                if not any(not (maximum >> point) & 1 for maximum in maxima):
                    continue
                count = sum((mask >> point) & 1 for mask in masks)
                pointed = {**record, "point": point, "pointed_count": count}
                if key not in pointed_extrema or count > pointed_extrema[key]["pointed_count"]:
                    pointed_extrema[key] = pointed
            rows += 1
            stream.update(f"{n}|{sorted(graph.edges())}|{alpha}|{deficit}|{len(masks)}\n".encode())

    all_failures = [value for value in all_extrema.values() if value["count"] > value["capacity"]]
    pointed_failures = [
        value for value in pointed_extrema.values() if value["pointed_count"] > value["capacity"]
    ]
    report = {
        "status": "FAIL_COARSE_BOUND" if all_failures or pointed_failures else "PASS_FINITE_EVIDENCE_ONLY",
        "scope": "atlas forests only; coarse maximal-set deficit diagnostic, no theorem claim",
        "graphs": graphs,
        "deficit_rows": rows,
        "all_maximal_failures": all_failures,
        "pointed_maximal_failures": pointed_failures,
        "all_extrema": [all_extrema[key] for key in sorted(all_extrema)],
        "pointed_extrema": [pointed_extrema[key] for key in sorted(pointed_extrema)],
        "stream_sha256": stream.hexdigest().upper(),
    }
    Path("closed_maximal_deficit_extrema_agent_20260829.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps({key: report[key] for key in ("status", "graphs", "deficit_rows", "all_maximal_failures", "pointed_maximal_failures")}, indent=2))


if __name__ == "__main__":
    main()
