#!/usr/bin/env python3
"""Probe an exact one-step long-interval payment for hard pointed Hall sets.

This is a bounded structural diagnostic.  The algebraic payment it checks is
all-order, but the script does not claim that every hard boundary set has an
eligible one-vertex extension.
"""

from __future__ import annotations

import json
from collections import defaultdict
from fractions import Fraction
from math import ceil, comb
from pathlib import Path

import networkx as nx


OUTPUT = Path("pointed_hall_immediate_superset_payment_probe_root_20260829.json")


def independent(graph: nx.Graph, chosen: frozenset[int]) -> bool:
    return all(not (u in chosen and v in chosen) for u, v in graph.edges())


def independent_sets(graph: nx.Graph) -> list[frozenset[int]]:
    vertices = tuple(graph)
    return [
        frozenset(vertices[i] for i in range(len(vertices)) if mask >> i & 1)
        for mask in range(1 << len(vertices))
        if independent(
            graph,
            frozenset(vertices[i] for i in range(len(vertices)) if mask >> i & 1),
        )
    ]


def neighbors_in_a(
    graph: nx.Graph, chosen: frozenset[int], maximum: frozenset[int]
) -> frozenset[int]:
    return frozenset(a for c in chosen for a in graph[c] if a in maximum)


def choose(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def main() -> None:
    instances = hard = extendable = unextendable = 0
    delta0 = delta1 = 0
    payment_edges = 0
    maximum_load_ratio = Fraction(0)
    first_unextendable: list[dict] = []
    first_tight_loads: list[dict] = []

    for graph0 in nx.graph_atlas_g():
        if graph0.number_of_nodes() == 0 or not nx.is_forest(graph0):
            continue
        graph = nx.convert_node_labels_to_integers(graph0)
        all_sets = independent_sets(graph)
        alpha = max(map(len, all_sets))
        if alpha % 3 not in (0, 2):
            continue
        rank = ceil((2 * alpha - 1) / 3)
        boundary_excess = alpha - rank + 1
        maxima = [chosen for chosen in all_sets if len(chosen) == alpha]

        for point in graph:
            for maximum in maxima:
                if point in maximum:
                    continue
                cover = frozenset(graph) - maximum
                instances += 1
                boundary: list[frozenset[int]] = []
                for chosen in all_sets:
                    if point not in chosen or not chosen <= cover:
                        continue
                    neigh = neighbors_in_a(graph, chosen, maximum)
                    if len(neigh) - len(chosen) != boundary_excess:
                        continue
                    reduced = chosen - {point}
                    delta = len(neigh) - len(neighbors_in_a(graph, reduced, maximum))
                    if delta <= 1:
                        boundary.append(chosen)
                        hard += 1
                        delta0 += delta == 0
                        delta1 += delta == 1

                successors: dict[frozenset[int], list[frozenset[int]]] = {}
                predecessors: dict[frozenset[int], list[frozenset[int]]] = defaultdict(list)
                for chosen in boundary:
                    neigh = neighbors_in_a(graph, chosen, maximum)
                    candidates = []
                    for vertex in cover - chosen:
                        enlarged = chosen | {vertex}
                        if not independent(graph, enlarged):
                            continue
                        if neighbors_in_a(graph, enlarged, maximum) != neigh:
                            continue
                        candidates.append(enlarged)
                        predecessors[enlarged].append(chosen)
                    successors[chosen] = candidates
                    payment_edges += len(candidates)
                    if candidates:
                        extendable += 1
                    else:
                        unextendable += 1
                        if len(first_unextendable) < 12:
                            first_unextendable.append(
                                {
                                    "graph6": (
                                        nx.to_graph6_bytes(graph, header=False)
                                        .decode()
                                        .strip()
                                        if nx.is_connected(graph)
                                        else None
                                    ),
                                    "edges": sorted(tuple(sorted(e)) for e in graph.edges()),
                                    "alpha": alpha,
                                    "rank": rank,
                                    "point": point,
                                    "maximum": sorted(maximum),
                                    "chosen": sorted(chosen),
                                    "chosen_size": len(chosen),
                                    "neighbor_size": len(neigh),
                                    "delta": delta,
                                }
                            )

                loads: dict[frozenset[int], Fraction] = defaultdict(Fraction)
                for chosen, targets in successors.items():
                    if not targets:
                        continue
                    share = Fraction(1, len(targets))
                    for target in targets:
                        loads[target] += share

                for target, load in loads.items():
                    neigh = neighbors_in_a(graph, target, maximum)
                    assert len(neigh) - len(target) == boundary_excess - 1
                    free = alpha - len(neigh)
                    high = rank * choose(free, rank - len(target))
                    low = choose(free, rank - 1 - len(target))
                    capacity = high - low
                    assert capacity == len(target)
                    assert len(predecessors[target]) <= len(target)
                    assert load <= len(predecessors[target]) <= capacity
                    ratio = load / capacity
                    if ratio > maximum_load_ratio:
                        maximum_load_ratio = ratio
                        first_tight_loads = [
                            {
                                "alpha": alpha,
                                "rank": rank,
                                "target_size": len(target),
                                "predecessors": len(predecessors[target]),
                                "load": str(load),
                                "capacity": capacity,
                                "ratio": str(ratio),
                            }
                        ]

    report = {
        "status": "PASS_BOUNDED_EXACT_IMMEDIATE_SUPERSET_PAYMENT_WITH_RESIDUE",
        "scope": (
            "All-order fractional payment for hard boundary sets possessing a "
            "one-vertex independent extension with no new A-neighbor; atlas "
            "enumeration only for existence/residue."
        ),
        "instances": instances,
        "hard_boundary_sets": hard,
        "delta0": delta0,
        "delta1": delta1,
        "extendable_paid": extendable,
        "unextendable_residue": unextendable,
        "payment_edges": payment_edges,
        "maximum_load_to_capacity": str(maximum_load_ratio),
        "first_maximum_load": first_tight_loads,
        "first_unextendable": first_unextendable,
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
