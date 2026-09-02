#!/usr/bin/env python3
"""Independent exact audit of the closed pointed Hall-boundary payment.

The all-order proof has two ingredients:

1. Closed Hall-boundary rows inject into maximal independent sets of size
   r-1.  Every forest has at most 2^k maximal independent k-sets.
2. The empty Boolean interval has capacity r*C(alpha,r), which is at least
   2^(r-1)+1 at the two operative residue classes.  The extra unit covers
   the only possible collision with the earlier p-deletion payment.

The executable part independently replays the exact recurrences, equivalence,
and simultaneous capacity allocation on every forest in the NetworkX atlas.
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
OUTPUT = HERE / "pointed_hall_closed_residue_payment_exact_agent_20260829.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def cutoff(alpha: int) -> int:
    return ceil((2 * alpha - 1) / 3)


def independent(graph: nx.Graph, chosen: frozenset[int]) -> bool:
    return all(not (u in chosen and v in chosen) for u, v in graph.edges())


def maximal(graph: nx.Graph, chosen: frozenset[int]) -> bool:
    if not independent(graph, chosen):
        return False
    return all(any(neighbor in chosen for neighbor in graph[vertex]) for vertex in graph if vertex not in chosen)


def independent_sets(graph: nx.Graph) -> list[frozenset[int]]:
    vertices = tuple(graph)
    result = []
    for mask in range(1 << len(vertices)):
        chosen = frozenset(vertices[index] for index in range(len(vertices)) if mask >> index & 1)
        if independent(graph, chosen):
            result.append(chosen)
    return result


def maximal_counts(graph: nx.Graph) -> list[int]:
    counts = [0] * (len(graph) + 1)
    for chosen in independent_sets(graph):
        if maximal(graph, chosen):
            counts[len(chosen)] += 1
    return counts


def neighbors_a(graph: nx.Graph, chosen: frozenset[int], maximum: frozenset[int]) -> frozenset[int]:
    return frozenset(a for vertex in chosen for a in graph[vertex] if a in maximum)


def coefficient(counts: list[int], rank: int) -> int:
    return counts[rank] if 0 <= rank < len(counts) else 0


def induced_without(graph: nx.Graph, vertices: set[int] | frozenset[int]) -> nx.Graph:
    result = graph.copy()
    result.remove_nodes_from(vertices)
    return result


def main() -> None:
    # Exact arithmetic replay, including the one-unit collision reserve.
    arithmetic_cells = 0
    minimum_reserve = None
    minimum_record = None
    for alpha in range(2, 10001):
        if alpha % 3 not in (0, 2):
            continue
        rank = cutoff(alpha)
        excess = alpha - rank + 1
        empty_capacity = rank * choose(alpha, rank)
        assert empty_capacity == excess * choose(alpha, excess)
        reserve = empty_capacity - (1 << (rank - 1))
        assert reserve >= 1

        # Independently replay the elementary proof of the strict inequality.
        if alpha % 3 == 0:
            m = alpha // 3
            assert rank == 2 * m and excess == m + 1 and m >= 1
            assert choose(3 * m, m + 1) >= choose(2 * m, m)
            assert (2 * m + 1) * choose(2 * m, m) >= 4**m
            assert 2 * (m + 1) > 2 * m + 1
        else:
            m = (alpha - 2) // 3
            assert rank == 2 * m + 1 and excess == m + 2
            assert choose(3 * m + 2, m + 2) >= choose(2 * m + 1, m + 1)
            assert (m + 1) * choose(2 * m + 1, m + 1) == (2 * m + 1) * choose(2 * m, m)
            assert (2 * m + 1) * choose(2 * m, m) >= 4**m
            assert m + 2 > m + 1

        if minimum_reserve is None or reserve < minimum_reserve:
            minimum_reserve = reserve
            minimum_record = {
                "alpha": alpha,
                "rank": rank,
                "excess": excess,
                "empty_capacity": empty_capacity,
                "two_power": 1 << (rank - 1),
                "reserve": reserve,
            }
        arithmetic_cells += 1

    # Literal replay of the maximal-set recurrence and 2^k bound.
    atlas_forests = recurrence_rows = maximal_bound_rows = 0
    for graph0 in [nx.empty_graph(0), *[
        nx.convert_node_labels_to_integers(item, ordering="sorted")
        for item in nx.graph_atlas_g()
        if item.number_of_nodes() and nx.is_forest(item)
    ]]:
        graph = graph0.copy()
        counts = maximal_counts(graph)
        atlas_forests += 1
        for size, value in enumerate(counts):
            assert value <= 1 << size
            maximal_bound_rows += 1
        if not graph:
            assert coefficient(counts, 0) == 1
            continue
        isolates = [vertex for vertex in graph if graph.degree(vertex) == 0]
        if isolates:
            vertex = isolates[0]
            smaller = induced_without(graph, {vertex})
            smaller_counts = maximal_counts(smaller)
            for size in range(len(counts)):
                assert coefficient(counts, size) == coefficient(smaller_counts, size - 1)
                recurrence_rows += 1
        else:
            leaf = next(vertex for vertex in graph if graph.degree(vertex) == 1)
            parent = next(iter(graph[leaf]))
            leaf_branch = induced_without(graph, {leaf, parent})
            parent_branch = induced_without(graph, {parent, *graph[parent]})
            leaf_counts = maximal_counts(leaf_branch)
            parent_counts = maximal_counts(parent_branch)
            for size in range(len(counts)):
                assert coefficient(counts, size) == (
                    coefficient(leaf_counts, size - 1) + coefficient(parent_counts, size - 1)
                )
                recurrence_rows += 1

    # Direct simultaneous Hall allocation on every eligible pointed atlas row.
    pointed_instances = boundary_rows = delta_paid = immediate_paid = closed_paid = 0
    empty_collisions = equivalence_checks = allocation_targets = 0
    maximum_load_ratio = Fraction(0)
    stream = hashlib.sha256()
    for graph0 in nx.graph_atlas_g():
        if graph0.number_of_nodes() == 0 or not nx.is_forest(graph0):
            continue
        graph = nx.convert_node_labels_to_integers(graph0, ordering="sorted")
        all_sets = independent_sets(graph)
        alpha = max(map(len, all_sets))
        if alpha % 3 not in (0, 2):
            continue
        rank = cutoff(alpha)
        excess = alpha - rank + 1
        empty_capacity = rank * choose(alpha, rank)
        maxima = [chosen for chosen in all_sets if len(chosen) == alpha]
        maximal_rank = [chosen for chosen in all_sets if len(chosen) == rank - 1 and maximal(graph, chosen)]

        for point in graph:
            for maximum in maxima:
                if point in maximum:
                    continue
                pointed_instances += 1
                cover = frozenset(graph) - maximum
                negative = []
                for chosen in all_sets:
                    if point not in chosen or not chosen <= cover:
                        continue
                    neigh = neighbors_a(graph, chosen, maximum)
                    if len(neigh) - len(chosen) == excess:
                        negative.append(chosen)
                boundary_rows += len(negative)

                loads: dict[frozenset[int], Fraction] = defaultdict(Fraction)
                closed_sets: list[frozenset[int]] = []
                closed_tops: set[frozenset[int]] = set()
                collision = 0

                for chosen in negative:
                    neigh = neighbors_a(graph, chosen, maximum)
                    reduced = chosen - {point}
                    delta = len(neigh) - len(neighbors_a(graph, reduced, maximum))
                    if delta >= 2:
                        target = reduced
                        free = alpha - len(neighbors_a(graph, target, maximum))
                        capacity = rank * choose(free, rank - len(target))
                        assert capacity >= rank >= 1
                        loads[target] += 1
                        delta_paid += 1
                        if not target:
                            collision += 1
                            empty_collisions += 1
                        continue

                    successors = []
                    for vertex in cover - chosen:
                        target = chosen | {vertex}
                        if independent(graph, target) and neighbors_a(graph, target, maximum) == neigh:
                            successors.append(target)

                    top = chosen | (maximum - neigh)
                    top_is_maximal = maximal(graph, top)
                    assert (not successors) == top_is_maximal
                    assert len(top) == rank - 1
                    equivalence_checks += 1

                    if successors:
                        share = Fraction(1, len(successors))
                        for target in successors:
                            loads[target] += share
                        immediate_paid += 1
                    else:
                        closed_sets.append(chosen)
                        assert top not in closed_tops
                        closed_tops.add(top)
                        closed_paid += 1

                assert collision <= 1
                assert len(closed_sets) == len(closed_tops)
                assert closed_tops <= set(maximal_rank)
                assert len(closed_sets) <= len(maximal_rank) <= 1 << (rank - 1)
                loads[frozenset()] += len(closed_sets)

                for target, load in loads.items():
                    neigh = neighbors_a(graph, target, maximum)
                    free = alpha - len(neigh)
                    high = rank * choose(free, rank - len(target))
                    low = choose(free, rank - 1 - len(target)) if point in target else 0
                    capacity = high - low
                    assert load <= capacity
                    allocation_targets += 1
                    if capacity:
                        maximum_load_ratio = max(maximum_load_ratio, load / capacity)
                assert loads[frozenset()] == len(closed_sets) + collision
                assert loads[frozenset()] <= empty_capacity
                stream.update(
                    f"{sorted(graph.edges())}|{point}|{sorted(maximum)}|{len(negative)}|"
                    f"{collision}|{len(closed_sets)}|{sorted((tuple(sorted(k)), str(v)) for k, v in loads.items())}\n".encode()
                )

    source = Path(__file__).resolve()
    report = {
        "schema": "pointed-hall-closed-residue-payment-exact-agent-v1",
        "date": "2026-08-29",
        "status": "PASS_EXACT_ALL_ORDER_POINTED_HALL_CLOSED_RESIDUE_PAYMENT",
        "claim": (
            "Closed hard pointed Hall rows inject into maximal independent (r-1)-sets; "
            "a forest has at most 2^(r-1) of these, while the empty interval has at "
            "least 2^(r-1)+1 capacity, including the unique possible empty-target collision."
        ),
        "arithmetic": {
            "alpha_max_replayed": 10000,
            "cells": arithmetic_cells,
            "minimum_reserve": minimum_record,
        },
        "maximal_set_recurrence": {
            "atlas_forests_including_empty": atlas_forests,
            "recurrence_rows": recurrence_rows,
            "two_power_bound_rows": maximal_bound_rows,
        },
        "atlas_allocation": {
            "pointed_maximum_set_instances": pointed_instances,
            "negative_boundary_rows": boundary_rows,
            "paid_delta_ge_2": delta_paid,
            "paid_immediate_superset": immediate_paid,
            "paid_closed_from_empty": closed_paid,
            "empty_target_collisions": empty_collisions,
            "closed_maximal_equivalence_checks": equivalence_checks,
            "positive_interval_targets": allocation_targets,
            "maximum_load_ratio": str(maximum_load_ratio),
            "value_stream_sha256": stream.hexdigest().upper(),
        },
        "scope": (
            "Exact all-order closure of the pointed Hall-boundary payment, conditional only "
            "on the separately frozen Hall-excess decomposition and the two earlier exact "
            "partial allocations. This does not by itself prove ISO, terminal payment, "
            "unimodality, or Erdos Problem 993."
        ),
        "source": source.name,
        "source_sha256": sha256(source),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(report["status"])
    print(json.dumps({"arithmetic": report["arithmetic"], "maximal_set_recurrence": report["maximal_set_recurrence"], "atlas_allocation": report["atlas_allocation"]}, indent=2))
    print("SOURCE", report["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
