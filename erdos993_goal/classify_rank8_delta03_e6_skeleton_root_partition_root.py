#!/usr/bin/env python3
"""Exact suppressed-skeleton and root-location partition for degree surplus 6."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
import os
from collections import Counter
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta03_e6_skeleton_root_partition_exact_20260825.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def degree_surplus(graph: nx.Graph) -> int:
    return sum(math.comb(graph.degree(v) - 1, 2) for v in graph)


def inventories() -> list[tuple[int, int, int]]:
    rows = []
    for b3 in range(7):
        for b4 in range(3):
            for b5 in range(2):
                if b3 + 3 * b4 + 6 * b5 == 6:
                    rows.append((b3, b4, b5))
    assert rows == [(0, 0, 1), (0, 2, 0), (3, 1, 0), (6, 0, 0)]
    return rows


def branch_trees(order: int):
    if order == 1:
        graph = nx.Graph()
        graph.add_node(0)
        yield graph
    else:
        yield from nx.nonisomorphic_trees(order)


def full_skeleton(branch_tree: nx.Graph, targets: tuple[int, ...]) -> nx.Graph:
    graph = nx.Graph()
    graph.add_nodes_from(branch_tree.nodes())
    graph.add_edges_from(branch_tree.edges())
    next_vertex = len(targets)
    for vertex, target in enumerate(targets):
        assert branch_tree.degree(vertex) <= target
        for _ in range(target - branch_tree.degree(vertex)):
            graph.add_edge(vertex, next_vertex)
            next_vertex += 1
    assert all(graph.degree(v) == targets[v] for v in range(len(targets)))
    assert all(graph.degree(v) == 1 for v in range(len(targets), len(graph)))
    assert nx.is_tree(graph)
    return graph


def enumerate_skeletons() -> list[dict[str, object]]:
    candidates: list[dict[str, object]] = []
    for b3, b4, b5 in inventories():
        target_multiset = (3,) * b3 + (4,) * b4 + (5,) * b5
        branch_order = len(target_multiset)
        inventory = {"b3": b3, "b4": b4, "b5": b5}
        for branch_tree in branch_trees(branch_order):
            for targets in sorted(set(itertools.permutations(target_multiset))):
                if any(branch_tree.degree(v) > targets[v] for v in branch_tree):
                    continue
                graph = full_skeleton(branch_tree, targets)
                if any(nx.is_isomorphic(graph, row["graph"]) for row in candidates):
                    continue
                candidates.append(
                    {
                        "inventory": inventory,
                        "targets": list(targets),
                        "branch_tree": branch_tree.copy(),
                        "graph": graph,
                    }
                )

    candidates.sort(
        key=lambda row: (
            row["inventory"]["b5"],
            row["inventory"]["b4"],
            row["inventory"]["b3"],
            nx.weisfeiler_lehman_graph_hash(row["graph"]),
            sorted(dict(row["graph"].degree()).values()),
        ),
        reverse=True,
    )
    assert len(candidates) == 10
    return candidates


def object_orbits(graph: nx.Graph, objects, image) -> list[list[object]]:
    automorphisms = list(
        nx.algorithms.isomorphism.GraphMatcher(graph, graph).isomorphisms_iter()
    )
    remaining = set(objects)
    orbits = []
    while remaining:
        representative = min(remaining, key=str)
        orbit = {image(representative, mapping) for mapping in automorphisms}
        assert orbit <= set(objects)
        remaining -= orbit
        orbits.append(sorted(orbit, key=str))
    assert sum(map(len, orbits)) == len(set(objects))
    return orbits


def edge(u: int, v: int) -> tuple[int, int]:
    return tuple(sorted((u, v)))


def skeleton_row(index: int, raw: dict[str, object]) -> dict[str, object]:
    graph: nx.Graph = raw["graph"]
    branch_order = len(raw["targets"])
    branch_vertices = tuple(range(branch_order))
    leaf_vertices = tuple(range(branch_order, len(graph)))
    spine_edges = tuple(
        edge(u, v) for u, v in graph.edges() if u < branch_order and v < branch_order
    )
    pendant_edges = tuple(
        edge(u, v) for u, v in graph.edges() if (u < branch_order) != (v < branch_order)
    )
    assert len(spine_edges) == branch_order - 1
    assert len(pendant_edges) == len(leaf_vertices)

    vertex_image = lambda vertex, mapping: mapping[vertex]
    edge_image = lambda item, mapping: edge(mapping[item[0]], mapping[item[1]])
    branch_orbits = object_orbits(graph, branch_vertices, vertex_image)
    leaf_orbits = object_orbits(graph, leaf_vertices, vertex_image)
    spine_orbits = object_orbits(graph, spine_edges, edge_image) if spine_edges else []
    pendant_orbits = object_orbits(graph, pendant_edges, edge_image)
    total_orbits = (
        len(branch_orbits) + len(leaf_orbits) + len(spine_orbits) + len(pendant_orbits)
    )
    automorphism_count = sum(
        1 for _ in nx.algorithms.isomorphism.GraphMatcher(graph, graph).isomorphisms_iter()
    )
    assert degree_surplus(graph) == 6
    assert len(graph) - graph.number_of_edges() == 1

    def normalize(orbits):
        return [
            [list(item) if isinstance(item, tuple) else item for item in orbit]
            for orbit in orbits
        ]

    return {
        "name": f"e6_skeleton_{index:02d}",
        "inventory": raw["inventory"],
        "branch_targets": raw["targets"],
        "branch_tree_edges": sorted([list(edge(u, v)) for u, v in raw["branch_tree"].edges()]),
        "full_skeleton_order": len(graph),
        "full_skeleton_edges": sorted([list(edge(u, v)) for u, v in graph.edges()]),
        "degree_sequence": sorted(dict(graph.degree()).values(), reverse=True),
        "degree_surplus": degree_surplus(graph),
        "automorphisms": automorphism_count,
        "root_location_partition": {
            "branch_vertex_orbits": normalize(branch_orbits),
            "leaf_vertex_orbits": normalize(leaf_orbits),
            "spine_internal_orbits": normalize(spine_orbits),
            "pendant_internal_orbits": normalize(pendant_orbits),
            "counts": {
                "branch": len(branch_orbits),
                "leaf": len(leaf_orbits),
                "spine_internal": len(spine_orbits),
                "pendant_internal": len(pendant_orbits),
                "total": total_orbits,
            },
        },
    }


def main() -> None:
    raw = enumerate_skeletons()
    rows = [skeleton_row(index + 1, item) for index, item in enumerate(raw)]
    inventory_counts = Counter(
        (row["inventory"]["b3"], row["inventory"]["b4"], row["inventory"]["b5"])
        for row in rows
    )
    assert inventory_counts == Counter({(0, 0, 1): 1, (0, 2, 0): 1, (3, 1, 0): 4, (6, 0, 0): 4})
    orbit_total = sum(row["root_location_partition"]["counts"]["total"] for row in rows)
    orbit_breakdown = {
        key: sum(row["root_location_partition"]["counts"][key] for row in rows)
        for key in ("branch", "leaf", "spine_internal", "pendant_internal")
    }
    assert orbit_total == 101
    assert sum(orbit_breakdown.values()) == orbit_total

    payload = {
        "schema": "rank8-delta03-e6-skeleton-root-partition-v1",
        "status": "PASS_EXACT_E6_SUPPRESSED_SKELETON_AND_ROOT_LOCATION_PARTITION",
        "degree_surplus_equation": "b3+3*b4+6*b5=6",
        "branch_degree_inventories": [
            {"b3": b3, "b4": b4, "b5": b5} for b3, b4, b5 in inventories()
        ],
        "classification": {
            "suppressed_skeletons": len(rows),
            "skeletons_by_inventory": {
                f"b3={key[0]},b4={key[1]},b5={key[2]}": value
                for key, value in sorted(inventory_counts.items())
            },
            "root_location_orbits": orbit_total,
            "root_orbits_by_kind": orbit_breakdown,
        },
        "skeletons": rows,
        "proof": (
            "Every degree at least six contributes more than six. The displayed "
            "Diophantine equation therefore exhausts the branch-degree inventory. "
            "For each inventory, every unlabeled branch tree and every target-degree "
            "assignment is generated, infeasible assignments are rejected, and "
            "isomorphic full suppressed skeletons are deduplicated. Automorphism "
            "orbits of branch vertices, leaves, spine edges, and pendant edges are "
            "exactly the possible root-location types."
        ),
        "scope_boundary": (
            "This is an exhaustive structural partition only. It does not prove "
            "Delta0..Delta3 positivity on any of the 101 root-location orbits."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("SKELETONS", len(rows), "ROOT_ORBITS", orbit_total, orbit_breakdown)
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
