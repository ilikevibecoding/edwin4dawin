#!/usr/bin/env python3
"""List bounded hard delta<=1 rows left by the private-neighbor payment."""

from __future__ import annotations

import json

import networkx as nx

from verify_pointed_hall_private_neighbor_payment_root import (
    all_independent_sets,
    cutoff,
)


def main() -> None:
    records = []
    for graph0 in nx.graph_atlas_g():
        if graph0.number_of_nodes() == 0 or not nx.is_forest(graph0):
            continue
        graph = nx.convert_node_labels_to_integers(graph0)
        independent_sets = all_independent_sets(graph)
        alpha = max(map(len, independent_sets))
        if alpha % 3 not in (0, 2):
            continue
        maximum_sets = [item for item in independent_sets if len(item) == alpha]
        rank = cutoff(alpha)
        excess_target = alpha - rank + 1
        for point in graph:
            for maximum_set in maximum_sets:
                if point in maximum_set:
                    continue
                cover = frozenset(graph) - maximum_set
                for chosen in independent_sets:
                    if point not in chosen or not chosen <= cover:
                        continue
                    neighbors_y = frozenset(
                        a for c in chosen for a in graph[c] if a in maximum_set
                    )
                    if len(neighbors_y) - len(chosen) != excess_target:
                        continue
                    reduced = chosen - {point}
                    neighbors_z = frozenset(
                        a for c in reduced for a in graph[c] if a in maximum_set
                    )
                    delta = len(neighbors_y - neighbors_z)
                    if delta > 1:
                        continue
                    records.append({
                        "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                        "edges": sorted(tuple(sorted(edge)) for edge in graph.edges()),
                        "alpha": alpha,
                        "rank": rank,
                        "point": point,
                        "maximum_set": sorted(maximum_set),
                        "cover": sorted(cover),
                        "boundary_set": sorted(chosen),
                        "neighbors_y": sorted(neighbors_y),
                        "neighbors_without_point": sorted(neighbors_z),
                        "private_delta": delta,
                    })
    print(json.dumps(records, indent=2))


if __name__ == "__main__":
    main()
