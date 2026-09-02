#!/usr/bin/env python3
"""Verify the exact matching-contraction reduction to oriented boundaries."""

from __future__ import annotations

import hashlib
import itertools
import json
from math import comb, ceil
import os
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "oriented_forest_hall_boundary_reduction_exact_root_20260829.json"
OBSTRUCTION = HERE / "oriented_forest_boundary_count_counterexample_exact_agent_20260829.json"
OBSTRUCTION_SHA = "7A43468A7382DDA4472538086DC9B611DD611BC81D3C95B4CA2D7C1824433E16"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def independent(graph: nx.Graph, vertices: frozenset[int]) -> bool:
    return all(not (u in vertices and v in vertices) for u, v in graph.edges())


def independent_sets(graph: nx.Graph) -> list[frozenset[int]]:
    vertices = tuple(graph.nodes())
    result = []
    for mask in range(1 << len(vertices)):
        chosen = frozenset(vertices[i] for i in range(len(vertices)) if mask >> i & 1)
        if independent(graph, chosen):
            result.append(chosen)
    return result


def maximum_matchings(graph: nx.Graph) -> list[frozenset[tuple[int, int]]]:
    edges = tuple(tuple(sorted(edge)) for edge in graph.edges())
    matchings = []
    best = -1
    for mask in range(1 << len(edges)):
        selected = [edges[i] for i in range(len(edges)) if mask >> i & 1]
        flat = [v for edge in selected for v in edge]
        if len(set(flat)) != len(flat):
            continue
        size = len(selected)
        frozen = frozenset(selected)
        if size > best:
            best = size
            matchings = [frozen]
        elif size == best:
            matchings.append(frozen)
    return matchings


def cutoff(alpha: int) -> int:
    return ceil((2 * alpha - 1) / 3)


def contract(
    graph: nx.Graph,
    maximum_set: frozenset[int],
    matching: frozenset[tuple[int, int]],
):
    cover = frozenset(graph) - maximum_set
    mate: dict[int, int] = {}
    for u, v in matching:
        if u in cover:
            c, a = u, v
        else:
            c, a = v, u
        assert c in cover and a in maximum_set
        assert c not in mate
        mate[c] = a
    assert set(mate) == set(cover)
    assert len(set(mate.values())) == len(cover)

    unit_of: dict[int, int] = {}
    unit_a: dict[int, int] = {}
    unit_c: dict[int, int] = {}
    next_unit = 0
    for c in sorted(cover):
        a = mate[c]
        unit_of[c] = next_unit
        unit_of[a] = next_unit
        unit_a[next_unit] = a
        unit_c[next_unit] = c
        next_unit += 1
    for a in sorted(maximum_set - frozenset(mate.values())):
        unit_of[a] = next_unit
        unit_a[next_unit] = a
        next_unit += 1
    assert next_unit == len(maximum_set)

    matching_edges = {tuple(sorted(edge)) for edge in matching}
    unit_edges: dict[tuple[int, int], tuple[str, int, int]] = {}
    directed: set[tuple[int, int]] = set()
    inactive: set[tuple[int, int]] = set()
    for edge in graph.edges():
        canonical = tuple(sorted(edge))
        if canonical in matching_edges:
            continue
        u, v = edge
        uu, vv = unit_of[u], unit_of[v]
        assert uu != vv
        key = tuple(sorted((uu, vv)))
        assert key not in unit_edges
        if u in cover and v in cover:
            inactive.add(key)
            unit_edges[key] = ("inactive", uu, vv)
        else:
            assert (u in cover) != (v in cover)
            c, a = (u, v) if u in cover else (v, u)
            source, target = unit_of[c], unit_of[a]
            directed.add((source, target))
            unit_edges[key] = ("directed", source, target)

    underlying = nx.Graph()
    underlying.add_nodes_from(range(next_unit))
    underlying.add_edges_from(unit_edges)
    assert nx.is_forest(underlying)
    return mate, unit_of, unit_c, directed, inactive, underlying


def external_boundary(directed: set[tuple[int, int]], subset: frozenset[int]):
    return frozenset(v for u, v in directed if u in subset and v not in subset)


def main() -> None:
    assert sha256(OBSTRUCTION) == OBSTRUCTION_SHA
    obstruction = json.loads(OBSTRUCTION.read_text(encoding="utf-8"))
    assert obstruction["status"] == "COUNTEREXAMPLE_EXACT_ORIENTED_FOREST_BOUNDARY_COUNT_TARGET"
    assert obstruction["first_failure_in_star_family_through_alpha_500"]["strict_excess"] > 0
    atlas_forests = 0
    eligible_points = 0
    maximum_sets = 0
    matching_contractions = 0
    exact_set_checks = 0
    operative_boundary_sets = 0
    oriented_overcount_checks = 0
    empty_slack_checks = 0
    closest = None

    for graph0 in nx.graph_atlas_g():
        if graph0.number_of_nodes() == 0 or not nx.is_forest(graph0):
            continue
        graph = nx.convert_node_labels_to_integers(graph0)
        atlas_forests += 1
        all_independent = independent_sets(graph)
        alpha = max(map(len, all_independent))
        max_sets = [item for item in all_independent if len(item) == alpha]
        max_match = maximum_matchings(graph)
        nu = len(next(iter(max_match)))
        assert alpha + nu == graph.number_of_nodes()

        for point in graph:
            avoiding = [item for item in max_sets if point not in item]
            if not avoiding:
                continue
            eligible_points += 1
            for maximum_set in avoiding:
                maximum_sets += 1
                cover = frozenset(graph) - maximum_set
                assert point in cover and len(cover) == nu
                for matching in max_match:
                    matching_contractions += 1
                    mate, unit_of, unit_c, directed, inactive, underlying = contract(
                        graph, maximum_set, matching
                    )
                    point_unit = unit_of[point]

                    actual_count = 0
                    operative_e = None
                    if alpha % 3 in (0, 2):
                        rank = cutoff(alpha)
                        operative_e = alpha - rank + 1
                        assert (alpha, rank, operative_e) == (
                            (alpha, 2 * (alpha // 3), alpha // 3 + 1)
                            if alpha % 3 == 0 else
                            (alpha, 2 * (alpha // 3) + 1, alpha // 3 + 2)
                        )
                        assert rank * comb(alpha, rank) == operative_e * comb(alpha, operative_e)
                        empty_slack_checks += 1

                    for chosen in all_independent:
                        if not chosen <= cover or point not in chosen:
                            continue
                        units = frozenset(unit_of[c] for c in chosen)
                        neighbors_a = frozenset(
                            a for c in chosen for a in graph[c] if a in maximum_set
                        )
                        matched_a = frozenset(mate[c] for c in chosen)
                        assert matched_a <= neighbors_a
                        exact_external = frozenset(unit_of[a] for a in neighbors_a - matched_a)
                        boundary = external_boundary(directed, units)
                        assert boundary == exact_external
                        excess = len(neighbors_a) - len(chosen)
                        assert len(boundary) == excess
                        exact_set_checks += 1
                        if operative_e is not None and excess == operative_e:
                            actual_count += 1
                            operative_boundary_sets += 1

                    if operative_e is not None:
                        oriented_count = 0
                        for mask in range(1 << alpha):
                            subset = frozenset(i for i in range(alpha) if mask >> i & 1)
                            if point_unit not in subset:
                                continue
                            if len(external_boundary(directed, subset)) == operative_e:
                                oriented_count += 1
                        assert actual_count <= oriented_count
                        capacity = operative_e * comb(alpha, operative_e)
                        record = {
                            "alpha": alpha,
                            "operative_excess": operative_e,
                            "actual_boundary_sets": actual_count,
                            "oriented_boundary_sets": oriented_count,
                            "empty_interval_capacity": capacity,
                        }
                        if closest is None or (
                            oriented_count * closest["empty_interval_capacity"]
                            > closest["oriented_boundary_sets"] * capacity
                        ):
                            closest = record
                        oriented_overcount_checks += 1

    source = Path(__file__).resolve()
    report = {
        "schema": "oriented-forest-hall-boundary-reduction-exact-root-v1",
        "date": "2026-08-29",
        "status": "PASS_EXACT_ORIENTED_FOREST_HALL_BOUNDARY_REDUCTION_WITH_REFUTED_EMPTY_ONLY_TARGET",
        "claim": (
            "Contracting a maximum matching against a fixed maximum independent "
            "set maps every pointed exact Hall-excess boundary set injectively "
            "to a pointed subset of a partially oriented alpha-vertex forest "
            "with the same external out-boundary size."
        ),
        "empty_interval_identity": "r*C(alpha,r)=e*C(alpha,e), e=alpha-r+1",
        "atlas": {
            "forests": atlas_forests,
            "eligible_points": eligible_points,
            "pointed_maximum_sets": maximum_sets,
            "matching_contractions": matching_contractions,
            "exact_set_checks": exact_set_checks,
            "operative_boundary_sets": operative_boundary_sets,
            "oriented_overcount_checks": oriented_overcount_checks,
            "empty_slack_checks": empty_slack_checks,
            "closest_finite_record": closest,
        },
        "refuted_target": {
            "claim": (
                "The unrestricted pointed oriented-boundary count is at most "
                "e*C(alpha,e)."
            ),
            "dependency": {
                OBSTRUCTION.name: OBSTRUCTION_SHA,
            },
            "repair_target": (
                "Retain positive nonempty long-interval slack; the exact "
                "162-vertex realization has a very positive pointed margin."
            ),
        },
        "scope": (
            "Exact reduction plus bounded atlas replay and a pinned exact "
            "obstruction to empty-only closure; WR, ISO, unimodality, and "
            "Erdos Problem 993 remain open."
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
