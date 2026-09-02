#!/usr/bin/env python3
"""Verify the private-neighbor partial payment in the pointed Hall reduction."""

from __future__ import annotations

import hashlib
import json
from math import comb, ceil
import os
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "pointed_hall_private_neighbor_payment_exact_root_20260829.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def independent(graph: nx.Graph, vertices: frozenset[int]) -> bool:
    return all(not (u in vertices and v in vertices) for u, v in graph.edges())


def all_independent_sets(graph: nx.Graph) -> list[frozenset[int]]:
    vertices = tuple(graph)
    result = []
    for mask in range(1 << len(vertices)):
        chosen = frozenset(vertices[i] for i in range(len(vertices)) if mask >> i & 1)
        if independent(graph, chosen):
            result.append(chosen)
    return result


def cutoff(alpha: int) -> int:
    return ceil((2 * alpha - 1) / 3)


def choose(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def main() -> None:
    forests = eligible_points = pointed_maximum_sets = 0
    boundary_sets = good_sets = hard_sets = zero_private = one_private = 0
    allocated_intervals: set[tuple] = set()
    allocated_positive_mass = 0
    minimum_good_mass = None
    structural_checks = 0

    for graph0 in nx.graph_atlas_g():
        if graph0.number_of_nodes() == 0 or not nx.is_forest(graph0):
            continue
        graph = nx.convert_node_labels_to_integers(graph0)
        forests += 1
        independent_sets = all_independent_sets(graph)
        alpha = max(map(len, independent_sets))
        maximum_sets = [item for item in independent_sets if len(item) == alpha]
        if alpha % 3 not in (0, 2):
            continue
        rank = cutoff(alpha)
        operative_excess = alpha - rank + 1

        for point in graph:
            avoiding = [item for item in maximum_sets if point not in item]
            if not avoiding:
                continue
            eligible_points += 1
            for maximum_set in avoiding:
                pointed_maximum_sets += 1
                cover = frozenset(graph) - maximum_set
                neighbors_p = frozenset(graph[point]) & maximum_set
                for chosen in independent_sets:
                    if point not in chosen or not chosen <= cover:
                        continue
                    neighbors_y = frozenset(
                        a for c in chosen for a in graph[c] if a in maximum_set
                    )
                    y = len(chosen)
                    excess = len(neighbors_y) - y
                    if excess != operative_excess:
                        continue
                    boundary_sets += 1
                    reduced = chosen - {point}
                    neighbors_z = frozenset(
                        a for c in reduced for a in graph[c] if a in maximum_set
                    )
                    delta = len(neighbors_y) - len(neighbors_z)
                    assert delta == len(neighbors_y - neighbors_z)
                    top = rank - y - 1 + delta
                    bottom = rank - y + 1
                    direct_mass = rank * choose(alpha - len(neighbors_z), rank - len(reduced))
                    formula_mass = rank * choose(top, bottom)
                    assert direct_mass == formula_mass

                    nonprivate = neighbors_p & neighbors_z
                    witnesses = {}
                    for a in nonprivate:
                        candidates = sorted(c for c in reduced if graph.has_edge(c, a))
                        assert candidates
                        witnesses[a] = candidates[0]
                    assert len(set(witnesses.values())) == len(witnesses)
                    assert len(neighbors_p) - delta <= y - 1
                    structural_checks += 1

                    key = (
                        nx.to_graph6_bytes(graph, header=False).decode().strip(),
                        point,
                        tuple(sorted(maximum_set)),
                        tuple(sorted(reduced)),
                    )
                    if delta >= 2:
                        good_sets += 1
                        assert formula_mass >= rank >= 1
                        assert key not in allocated_intervals
                        allocated_intervals.add(key)
                        allocated_positive_mass += formula_mass
                        minimum_good_mass = formula_mass if minimum_good_mass is None else min(
                            minimum_good_mass, formula_mass
                        )
                    else:
                        hard_sets += 1
                        zero_private += delta == 0
                        one_private += delta == 1
                        assert formula_mass == 0
                        assert len(neighbors_p) <= y

    assert good_sets == len(allocated_intervals)
    assert allocated_positive_mass >= good_sets
    source = Path(__file__).resolve()
    report = {
        "schema": "pointed-hall-private-neighbor-payment-exact-root-v1",
        "date": "2026-08-29",
        "status": "PASS_EXACT_POINTED_HALL_PRIVATE_NEIGHBOR_PARTIAL_PAYMENT",
        "claim": (
            "Every pointed exact Hall-boundary set with at least two private "
            "A-neighbors of p is paid injectively by its distinct p-deleted "
            "positive Boolean interval; only delta<=1 remains."
        ),
        "atlas": {
            "forests": forests,
            "eligible_points": eligible_points,
            "pointed_maximum_sets": pointed_maximum_sets,
            "boundary_sets": boundary_sets,
            "paid_delta_ge_2": good_sets,
            "remaining_delta_le_1": hard_sets,
            "remaining_delta_0": zero_private,
            "remaining_delta_1": one_private,
            "distinct_allocated_intervals": len(allocated_intervals),
            "allocated_positive_mass": allocated_positive_mass,
            "minimum_good_interval_mass": minimum_good_mass,
            "structural_injection_checks": structural_checks,
        },
        "remaining_target": (
            "Pay exact Hall-boundary sets with at most one private A-neighbor "
            "of p; each satisfies deg_A(p)<=|Y|."
        ),
        "scope": (
            "Exact partial payment plus bounded replay; the remaining hard "
            "payment, WR, ISO, unimodality, and Erdos Problem 993 remain open."
        ),
        "source": source.name,
        "source_sha256": sha256(source),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(report["status"])
    print(json.dumps(report["atlas"], indent=2))
    print("SOURCE", report["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
