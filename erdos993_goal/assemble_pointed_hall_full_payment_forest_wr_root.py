#!/usr/bin/env python3
"""Assemble and replay the full pointed Hall payment and forest WR theorem.

The all-order proof consists of:
  * delta>=2 private-neighbor payment;
  * immediate covered-superset fractional payment;
  * closed hard sets inject into maximal independent (r-1)-sets;
  * m_k(F)<=2^k for every forest;
  * empty-interval binomial capacity at the two boundary residues;
  * the exact leaf-boundary induction from BP to WR.

Finite atlas checks replay every identity and allocation but are not used as
an all-order substitute for the displayed combinatorial arguments.
"""

from __future__ import annotations

import hashlib
import json
import os
from collections import Counter, defaultdict
from fractions import Fraction
from math import ceil, comb
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "pointed_hall_full_payment_forest_wr_exact_root_20260829.json"

PINNED = {
    "verify_weak_prefix_ratio_leaf_boundary_reduction_root.py": "A6EE4BE7F267F3EBE5E329434742C8A89B6E2650B0AE170807D8228BFE7465F0",
    "weak_prefix_ratio_leaf_boundary_reduction_exact_root_20260829.json": "4921059C95130F545E4917F34B337F875EC7B230B4873769B854A7DDCD140297",
    "verify_pointed_hall_private_neighbor_payment_root.py": "ABF7B04B0157F6C6BCF75A24C84BB5F723A06D84E9EAB7BA295FDA0F98A1A8B9",
    "pointed_hall_private_neighbor_payment_exact_root_20260829.json": "4BE48899BC2E37413D00D8D967236EC75199B3FF365FD184DCDA0577DB4E516A",
    "verify_pointed_hall_immediate_superset_payment_root.py": "DCC5EC1765831FF5DDBF18C91F6C6B796E20B3C250146EE9C840F24C766ABFED",
    "pointed_hall_immediate_superset_payment_exact_root_20260829.json": "B1D21DDE6DB101DC4749A08A13F66F98C9F13BA2BD033D104BD61C5B8F5B6BB0",
}


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


def maximal(graph: nx.Graph, chosen: frozenset[int]) -> bool:
    return independent(graph, chosen) and all(
        vertex in chosen or any(neighbor in chosen for neighbor in graph[vertex])
        for vertex in graph
    )


def maximal_row(graph: nx.Graph) -> Counter[int]:
    return Counter(map(len, filter(lambda item: maximal(graph, item), all_independent_sets(graph))))


def neighbors_a(
    graph: nx.Graph, chosen: frozenset[int], maximum: frozenset[int]
) -> frozenset[int]:
    return frozenset(a for c in chosen for a in graph[c] if a in maximum)


def cutoff(alpha: int) -> int:
    return ceil((2 * alpha - 1) / 3)


def arithmetic_audit(limit: int = 10000) -> dict:
    cells = 0
    minimum_gap = None
    minimum_row = None
    for alpha in range(1, limit + 1):
        if alpha % 3 not in (0, 2):
            continue
        rank = cutoff(alpha)
        excess = alpha - rank + 1
        capacity = excess * comb(alpha, excess)
        maximal_bound = 1 << (rank - 1)
        gap = capacity - maximal_bound
        assert capacity == rank * comb(alpha, rank)
        assert gap >= 1
        cells += 1
        if minimum_gap is None or gap < minimum_gap:
            minimum_gap = gap
            minimum_row = {
                "alpha": alpha,
                "rank": rank,
                "excess": excess,
                "capacity": capacity,
                "maximal_bound": maximal_bound,
                "gap": gap,
            }
    return {"cells": cells, "minimum": minimum_row}


def main() -> None:
    for name, expected in PINNED.items():
        assert sha256(HERE / name) == expected, name
    assert json.loads((HERE / "weak_prefix_ratio_leaf_boundary_reduction_exact_root_20260829.json").read_text())["status"] == "PASS_EXACT_WEAK_PREFIX_RATIO_LEAF_BOUNDARY_REDUCTION"
    assert json.loads((HERE / "pointed_hall_private_neighbor_payment_exact_root_20260829.json").read_text())["status"] == "PASS_EXACT_POINTED_HALL_PRIVATE_NEIGHBOR_PARTIAL_PAYMENT"
    assert json.loads((HERE / "pointed_hall_immediate_superset_payment_exact_root_20260829.json").read_text())["status"] == "PASS_EXACT_POINTED_HALL_IMMEDIATE_SUPERSET_PAYMENT"

    arithmetic = arithmetic_audit()
    forests = recurrence_cells = maximal_bound_cells = 0
    instances = boundary = delta_paid = immediate_paid = closed_paid = 0
    closed_equivalence_checks = allocation_checks = 0
    maximum_load_ratio = Fraction(0)
    minimum_literal_margin = None

    for graph0 in nx.graph_atlas_g():
        if graph0.number_of_nodes() == 0 or not nx.is_forest(graph0):
            continue
        graph = nx.convert_node_labels_to_integers(graph0)
        forests += 1
        all_sets = all_independent_sets(graph)
        max_row = Counter(map(len, filter(lambda item: maximal(graph, item), all_sets)))
        for size, count in max_row.items():
            assert count <= 1 << size
            maximal_bound_cells += 1

        # Replay the exact leaf/isolate recurrence behind m_k(F)<=2^k.
        isolates = list(nx.isolates(graph))
        if isolates:
            vertex = isolates[0]
            reduced = graph.copy()
            reduced.remove_node(vertex)
            child = maximal_row(reduced)
            for size in range(len(graph) + 1):
                assert max_row[size] == child[size - 1]
                recurrence_cells += 1
        elif graph.number_of_edges():
            leaf = next(vertex for vertex in graph if graph.degree(vertex) == 1)
            neighbor = next(iter(graph[leaf]))
            first = graph.copy()
            first.remove_nodes_from((leaf, neighbor))
            second = graph.copy()
            second.remove_nodes_from([neighbor, *graph[neighbor]])
            row_first = maximal_row(first)
            row_second = maximal_row(second)
            for size in range(len(graph) + 1):
                assert max_row[size] == row_first[size - 1] + row_second[size - 1]
                recurrence_cells += 1

        alpha = max(map(len, all_sets))
        if alpha % 3 not in (0, 2):
            continue
        rank = cutoff(alpha)
        excess0 = alpha - rank + 1
        maxima = [item for item in all_sets if len(item) == alpha]
        literal_i_rank = sum(len(item) == rank for item in all_sets)

        for point in graph:
            for maximum in maxima:
                if point in maximum:
                    continue
                instances += 1
                cover = frozenset(graph) - maximum
                negatives = []
                for chosen in all_sets:
                    if point not in chosen or not chosen <= cover:
                        continue
                    neigh = neighbors_a(graph, chosen, maximum)
                    if len(neigh) - len(chosen) == excess0:
                        negatives.append(chosen)
                boundary += len(negatives)

                loads: dict[frozenset[int], Fraction] = defaultdict(Fraction)
                immediate_targets: dict[frozenset[int], list[frozenset[int]]] = {}
                closed = []
                for chosen in negatives:
                    neigh = neighbors_a(graph, chosen, maximum)
                    reduced = chosen - {point}
                    delta = len(neigh) - len(neighbors_a(graph, reduced, maximum))
                    if delta >= 2:
                        loads[reduced] += 1
                        delta_paid += 1
                        continue
                    targets = []
                    for vertex in cover - chosen:
                        target = chosen | {vertex}
                        if independent(graph, target) and neighbors_a(
                            graph, target, maximum
                        ) == neigh:
                            targets.append(target)
                    if targets:
                        immediate_targets[chosen] = targets
                        immediate_paid += 1
                    else:
                        top = chosen | (maximum - neigh)
                        assert len(top) == rank - 1
                        assert maximal(graph, top)
                        assert top & cover == chosen
                        closed_equivalence_checks += 1
                        closed.append(chosen)

                for chosen, targets in immediate_targets.items():
                    share = Fraction(1, len(targets))
                    for target in targets:
                        loads[target] += share
                if closed:
                    assert len(closed) <= max_row[rank - 1] <= 1 << (rank - 1)
                    loads[frozenset()] += len(closed)
                    closed_paid += len(closed)

                assert sum(loads.values()) == len(negatives)
                for target, load in loads.items():
                    neigh = neighbors_a(graph, target, maximum)
                    free = alpha - len(neigh)
                    high = rank * choose(free, rank - len(target))
                    low = (
                        choose(free, rank - 1 - len(target))
                        if point in target
                        else 0
                    )
                    capacity = high - low
                    assert load <= capacity
                    if capacity:
                        maximum_load_ratio = max(maximum_load_ratio, load / capacity)
                    allocation_checks += 1

                pointed_low = sum(
                    len(item) == rank - 1 and point in item for item in all_sets
                )
                literal_margin = rank * literal_i_rank - pointed_low
                assert literal_margin >= 0
                minimum_literal_margin = (
                    literal_margin
                    if minimum_literal_margin is None
                    else min(minimum_literal_margin, literal_margin)
                )

    source = Path(__file__).resolve()
    report = {
        "schema": "pointed-hall-full-payment-forest-wr-exact-root-v1",
        "date": "2026-08-29",
        "status": "PASS_EXACT_POINTED_HALL_FULL_PAYMENT_AND_FOREST_WEAK_PREFIX_RATIO",
        "theorems": [
            "For every forest F and every k, the number of maximal independent k-sets is at most 2^k.",
            "The pointed Hall boundary BP holds for every required forest, point, and residue.",
            "For every forest F, i_(r-1)(F) <= r*i_r(F) whenever 1<=r<ceil((2*alpha(F)-1)/3).",
        ],
        "arithmetic": arithmetic,
        "atlas": {
            "forests": forests,
            "maximal_bound_cells": maximal_bound_cells,
            "recurrence_cells": recurrence_cells,
            "pointed_maximum_set_instances": instances,
            "boundary_sets": boundary,
            "delta_ge_2_paid": delta_paid,
            "immediate_superset_paid": immediate_paid,
            "closed_paid_by_empty": closed_paid,
            "closed_equivalence_checks": closed_equivalence_checks,
            "allocation_capacity_checks": allocation_checks,
            "maximum_load_ratio": str(maximum_load_ratio),
            "minimum_literal_pointed_margin": minimum_literal_margin,
        },
        "dependencies": PINNED,
        "scope": (
            "This proves BP and WR for all forests. ISO remains unproved, so "
            "this is not yet a proof of unimodality or Erdos Problem 993."
        ),
        "source": source.name,
        "source_sha256": sha256(source),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(report["status"])
    print(json.dumps({"arithmetic": arithmetic, "atlas": report["atlas"]}, indent=2))
    print("SOURCE", report["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
