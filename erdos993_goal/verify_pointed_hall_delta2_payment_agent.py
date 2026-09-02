#!/usr/bin/env python3
"""Audit the exact delta>=2 long-interval payment for pointed Hall rows.

This verifier is a bounded atlas replay of an elementary all-graph identity.
It does not prove the remaining delta<=1 boundary family.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import os
from math import comb, ceil
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "pointed_hall_delta2_payment_exact_agent_20260829.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def independent(graph: nx.Graph, chosen: frozenset[int]) -> bool:
    return all(not (u in chosen and v in chosen) for u, v in graph.edges())


def independent_sets(graph: nx.Graph, allowed: frozenset[int]) -> list[frozenset[int]]:
    vertices = sorted(allowed)
    result = []
    for size in range(len(vertices) + 1):
        for subset in itertools.combinations(vertices, size):
            frozen = frozenset(subset)
            if independent(graph, frozen):
                result.append(frozen)
    return result


def maximum_sets(graph: nx.Graph) -> list[frozenset[int]]:
    all_sets = independent_sets(graph, frozenset(graph))
    alpha = max(map(len, all_sets))
    return [chosen for chosen in all_sets if len(chosen) == alpha]


def neighbors_in(graph: nx.Graph, chosen: frozenset[int], aset: frozenset[int]) -> frozenset[int]:
    return frozenset(a for c in chosen for a in graph[c] if a in aset)


def main() -> None:
    atlas_forests = 0
    pointed_instances = 0
    rank_rows = 0
    boundary_sets = 0
    delta2_sets = 0
    hard_sets = 0
    allocated_positive_units = 0
    hard_witness_checks = 0
    value_stream = hashlib.sha256()

    for graph0 in nx.graph_atlas_g():
        if len(graph0) == 0 or not nx.is_forest(graph0):
            continue
        graph = nx.convert_node_labels_to_integers(graph0, ordering="sorted")
        atlas_forests += 1
        max_sets = maximum_sets(graph)
        alpha = len(max_sets[0])
        if alpha % 3 not in (0, 2):
            continue
        rank = ceil((2 * alpha - 1) / 3)
        operative_excess = alpha - rank + 1

        for point in graph:
            for aset in max_sets:
                if point in aset:
                    continue
                pointed_instances += 1
                cover = frozenset(graph) - aset
                rows = independent_sets(graph, cover)
                seen_z: set[frozenset[int]] = set()
                for yset in rows:
                    if point not in yset:
                        continue
                    n_y = neighbors_in(graph, yset, aset)
                    excess = len(n_y) - len(yset)
                    if excess != operative_excess:
                        continue
                    boundary_sets += 1
                    zset = yset - {point}
                    n_z = neighbors_in(graph, zset, aset)
                    delta = len(n_y - n_z)
                    assert len(n_y) - len(n_z) == delta
                    ysize = len(yset)
                    free_z = alpha - len(n_z)
                    target_from_z = rank - len(zset)
                    literal_term = rank * (
                        comb(free_z, target_from_z)
                        if 0 <= target_from_z <= free_z
                        else 0
                    )
                    closed_term = rank * (
                        comb(rank - ysize - 1 + delta, rank - ysize + 1)
                        if rank - ysize - 1 + delta >= 0
                        else 0
                    )
                    assert literal_term == closed_term

                    if delta >= 2:
                        delta2_sets += 1
                        assert zset not in seen_z
                        seen_z.add(zset)
                        assert literal_term >= rank >= 1
                        allocated_positive_units += 1
                    else:
                        hard_sets += 1
                        degree_a = len(neighbors_in(graph, frozenset({point}), aset))
                        covered_point_neighbors = (
                            neighbors_in(graph, frozenset({point}), aset) & n_z
                        )
                        assert len(covered_point_neighbors) == degree_a - delta
                        # In a forest, no z can meet two distinct A-neighbors of p;
                        # otherwise p-a-z-a'-p is a 4-cycle.
                        for z in zset:
                            common = set(graph[z]) & set(graph[point]) & set(aset)
                            assert len(common) <= 1
                        assert len(zset) >= degree_a - delta >= degree_a - 1
                        hard_witness_checks += 1

                    value_stream.update(
                        (
                            f"{len(graph)}|{alpha}|{point}|{rank}|"
                            f"{tuple(sorted(aset))}|{tuple(sorted(yset))}|"
                            f"{delta}|{literal_term}\n"
                        ).encode()
                    )
                rank_rows += 1

    assert delta2_sets == allocated_positive_units
    source = Path(__file__).resolve()
    report = {
        "schema": "pointed-hall-delta2-payment-exact-agent-v1",
        "date": "2026-08-29",
        "status": "PASS_EXACT_POINTED_HALL_DELTA2_LONG_INTERVAL_PAYMENT",
        "claim": (
            "For each pointed exact-boundary Y, Z=Y-{p} contributes "
            "r*C(r-|Y|-1+delta,r-|Y|+1); delta>=2 pays Y injectively. "
            "If delta<=1 then Y contains distinct distance-two witnesses for "
            "all but at most one A-neighbor of p."
        ),
        "atlas": {
            "forests": atlas_forests,
            "pointed_maximum_set_instances": pointed_instances,
            "rank_rows": rank_rows,
            "exact_boundary_sets": boundary_sets,
            "delta_ge_2_sets": delta2_sets,
            "delta_le_1_hard_sets": hard_sets,
            "allocated_positive_units": allocated_positive_units,
            "hard_witness_checks": hard_witness_checks,
            "value_stream_sha256": value_stream.hexdigest().upper(),
        },
        "remaining_target": (
            "Pay only the delta<=1 boundary sets; this verifier does not prove "
            "the pointed boundary, WR, ISO, unimodality, or Erdos 993."
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
