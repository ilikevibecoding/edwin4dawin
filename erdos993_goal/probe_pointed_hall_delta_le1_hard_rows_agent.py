#!/usr/bin/env python3
"""List the residual delta<=1 pointed Hall-boundary rows in the atlas."""

from __future__ import annotations

import json
from math import ceil
from pathlib import Path

import networkx as nx

from verify_pointed_hall_delta2_payment_agent import (
    independent_sets,
    maximum_sets,
    neighbors_in,
)


def main() -> None:
    records = []
    for graph0 in nx.graph_atlas_g():
        if len(graph0) == 0 or not nx.is_forest(graph0):
            continue
        graph = nx.convert_node_labels_to_integers(graph0, ordering="sorted")
        max_sets = maximum_sets(graph)
        alpha = len(max_sets[0])
        if alpha % 3 not in (0, 2):
            continue
        rank = ceil((2 * alpha - 1) / 3)
        excess0 = alpha - rank + 1
        for point in graph:
            for aset in max_sets:
                if point in aset:
                    continue
                cover = frozenset(graph) - aset
                for yset in independent_sets(graph, cover):
                    if point not in yset:
                        continue
                    n_y = neighbors_in(graph, yset, aset)
                    if len(n_y) - len(yset) != excess0:
                        continue
                    zset = yset - {point}
                    n_z = neighbors_in(graph, zset, aset)
                    delta = len(n_y - n_z)
                    if delta > 1:
                        continue
                    # List every p-free subrow of Y and its free-rank slack.
                    subset_rows = []
                    for subset in independent_sets(graph, zset):
                        n_subset = neighbors_in(graph, subset, aset)
                        free = alpha - len(n_subset)
                        need = rank - len(subset)
                        ways = 0
                        if 0 <= need <= free:
                            from math import comb

                            ways = rank * comb(free, need)
                        subset_rows.append(
                            {
                                "subset": sorted(subset),
                                "removed_from_y": sorted(yset - subset),
                                "neighbor_drop": len(n_y - n_subset),
                                "positive_pointed_term": ways,
                            }
                        )
                    records.append(
                        {
                            "order": len(graph),
                            "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                            "edges": sorted(tuple(sorted(edge)) for edge in graph.edges()),
                            "alpha": alpha,
                            "rank": rank,
                            "operative_excess": excess0,
                            "point": point,
                            "maximum_set": sorted(aset),
                            "cover": sorted(cover),
                            "boundary_y": sorted(yset),
                            "neighbors_y": sorted(n_y),
                            "delta": delta,
                            "point_A_neighbors": sorted(set(graph[point]) & set(aset)),
                            "subset_rows": subset_rows,
                        }
                    )
    report = {
        "status": "PROBE_ONLY",
        "hard_rows": len(records),
        "records": records,
        "scope": "atlas diagnostic only; no theorem claim",
    }
    Path("pointed_hall_delta_le1_hard_rows_probe_agent_20260829.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
