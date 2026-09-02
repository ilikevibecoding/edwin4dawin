#!/usr/bin/env python3
"""Exact verifier for one-step covered-superset Hall payment.

The theorem is algebraic and applies to every graph/max-set Hall interval.
The atlas and synthetic checks are independent finite replays of its use.
"""

from __future__ import annotations

import hashlib
import json
import os
from collections import defaultdict
from fractions import Fraction
from math import ceil, comb
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "pointed_hall_immediate_superset_payment_exact_root_20260829.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def independent(graph: nx.Graph, chosen: frozenset[int]) -> bool:
    return all(not (u in chosen and v in chosen) for u, v in graph.edges())


def all_independent_sets(graph: nx.Graph) -> list[frozenset[int]]:
    vertices = tuple(graph)
    result = []
    for mask in range(1 << len(vertices)):
        chosen = frozenset(vertices[i] for i in range(len(vertices)) if mask >> i & 1)
        if independent(graph, chosen):
            result.append(chosen)
    return result


def neighbors_a(
    graph: nx.Graph, chosen: frozenset[int], maximum: frozenset[int]
) -> frozenset[int]:
    return frozenset(a for c in chosen for a in graph[c] if a in maximum)


def synthetic_out_star() -> tuple[nx.Graph, frozenset[int], int, frozenset[int]]:
    """Alpha-six hard boundary with three covered one-step successors."""
    graph = nx.Graph()
    # Six matched units (a_i,c_i); c_0 is the active center, c_5=p.
    for index in range(6):
        graph.add_edge(index, 6 + index)
    for head in range(1, 5):
        graph.add_edge(6, head)
    maximum = frozenset(range(6))
    point = 11
    chosen = frozenset((point, 6, 7))
    return graph, maximum, point, chosen


def main() -> None:
    algebra_cells = 0
    for alpha in range(1, 301):
        for rank in range(1, alpha + 1):
            excess = alpha - rank + 1
            for y in range(1, rank):
                d = y + excess
                if d > alpha:
                    continue
                target_y = y + 1
                free = alpha - d
                assert free == rank - target_y
                margin = rank * choose(free, rank - target_y) - choose(
                    free, rank - 1 - target_y
                )
                assert margin == target_y
                algebra_cells += 1

    # A literal positive example, including the hard delta=1 condition.
    graph, maximum, point, chosen = synthetic_out_star()
    alpha = len(maximum)
    rank = ceil((2 * alpha - 1) / 3)
    excess = alpha - rank + 1
    neigh = neighbors_a(graph, chosen, maximum)
    assert len(neigh) - len(chosen) == excess
    reduced = chosen - {point}
    synthetic_delta = len(neigh) - len(neighbors_a(graph, reduced, maximum))
    assert synthetic_delta == 1
    cover = frozenset(graph) - maximum
    successors = []
    for vertex in cover - chosen:
        target = chosen | {vertex}
        if independent(graph, target) and neighbors_a(graph, target, maximum) == neigh:
            successors.append(target)
    assert len(successors) == 3
    for target in successors:
        free = alpha - len(neighbors_a(graph, target, maximum))
        margin = rank * choose(free, rank - len(target)) - choose(
            free, rank - 1 - len(target)
        )
        assert margin == len(target) == 4

    # Atlas replay: reconstruct all hard boundary sets.  Small atlas hard
    # instances happen to be closed, which precisely records the residue.
    forests = instances = hard = extendable = closed = edges = 0
    maximum_load = Fraction(0)
    for graph0 in nx.graph_atlas_g():
        if graph0.number_of_nodes() == 0 or not nx.is_forest(graph0):
            continue
        graph = nx.convert_node_labels_to_integers(graph0)
        forests += 1
        all_sets = all_independent_sets(graph)
        alpha = max(map(len, all_sets))
        if alpha % 3 not in (0, 2):
            continue
        rank = ceil((2 * alpha - 1) / 3)
        excess = alpha - rank + 1
        maxima = [item for item in all_sets if len(item) == alpha]
        for point in graph:
            for maximum in maxima:
                if point in maximum:
                    continue
                instances += 1
                cover = frozenset(graph) - maximum
                left = []
                for chosen in all_sets:
                    if point not in chosen or not chosen <= cover:
                        continue
                    neigh = neighbors_a(graph, chosen, maximum)
                    if len(neigh) - len(chosen) != excess:
                        continue
                    delta = len(neigh) - len(
                        neighbors_a(graph, chosen - {point}, maximum)
                    )
                    if delta <= 1:
                        left.append(chosen)
                        hard += 1
                succ: dict[frozenset[int], list[frozenset[int]]] = {}
                pred: dict[frozenset[int], list[frozenset[int]]] = defaultdict(list)
                for chosen in left:
                    neigh = neighbors_a(graph, chosen, maximum)
                    targets = []
                    for vertex in cover - chosen:
                        target = chosen | {vertex}
                        if independent(graph, target) and neighbors_a(
                            graph, target, maximum
                        ) == neigh:
                            targets.append(target)
                            pred[target].append(chosen)
                    succ[chosen] = targets
                    edges += len(targets)
                    if targets:
                        extendable += 1
                    else:
                        closed += 1
                load: dict[frozenset[int], Fraction] = defaultdict(Fraction)
                for chosen, targets in succ.items():
                    if targets:
                        for target in targets:
                            load[target] += Fraction(1, len(targets))
                for target, value in load.items():
                    assert value <= len(pred[target]) <= len(target)
                    maximum_load = max(maximum_load, value / len(target))

    source = Path(__file__).resolve()
    report = {
        "schema": "pointed-hall-immediate-superset-payment-exact-root-v1",
        "date": "2026-08-29",
        "status": "PASS_EXACT_POINTED_HALL_IMMEDIATE_SUPERSET_PAYMENT",
        "claim": (
            "Every hard pointed Hall-boundary set having an independent "
            "one-vertex extension with no new A-neighbor is paid fractionally "
            "by immediate long intervals; each target has exact capacity equal "
            "to its cardinality."
        ),
        "algebra_cells": algebra_cells,
        "synthetic": {
            "alpha": 6,
            "rank": 4,
            "delta": synthetic_delta,
            "successors": len(successors),
            "capacity_each": 4,
        },
        "atlas": {
            "forests": forests,
            "pointed_maximum_set_instances": instances,
            "hard_boundary_sets": hard,
            "extendable_paid": extendable,
            "closed_residue": closed,
            "payment_edges": edges,
            "maximum_fractional_load_ratio": str(maximum_load),
        },
        "disjointness": (
            "Immediate successor targets contain p; delta>=2 p-deleted target "
            "intervals and the empty interval avoid p, so the capacities do not collide."
        ),
        "remaining_target": (
            "Pay hard boundary sets with no independent outside cover vertex "
            "whose A-neighborhood is already covered."
        ),
        "scope": (
            "Exact all-order partial payment only; the closed residue, WR, ISO, "
            "unimodality, and Erdos Problem 993 remain open."
        ),
        "source": source.name,
        "source_sha256": sha256(source),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(report["status"])
    print(json.dumps({"algebra_cells": algebra_cells, "synthetic": report["synthetic"], "atlas": report["atlas"]}, indent=2))
    print("SOURCE", report["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
