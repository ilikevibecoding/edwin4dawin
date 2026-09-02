#!/usr/bin/env python3
"""Independent all-tree audit of the degree-surplus-six skeleton partition."""

from __future__ import annotations

import hashlib
import json
import math
import os
from collections import Counter
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
PRODUCER = HERE / "classify_rank8_delta03_e6_skeleton_root_partition_root.py"
PRIMARY = HERE / "rank8_delta03_e6_skeleton_root_partition_exact_20260825.json"
OUTPUT = HERE / "rank8_delta03_e6_skeleton_root_partition_independent_audit_20260825.json"
EXPECTED_PRODUCER_SHA256 = "2D09166564BD9D9286781CB17E6F7387D1AF3F57BB03A761ED2548B9EE76077A"
EXPECTED_PRIMARY_SHA256 = "B8D2D160F679361AED1D337B9E814DA6B985ACCD19434DF629887DE0E7AE5307"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def surplus(graph: nx.Graph) -> int:
    return sum(math.comb(graph.degree(v) - 1, 2) for v in graph)


def edge(u: int, v: int) -> tuple[int, int]:
    return tuple(sorted((u, v)))


def orbit_count(graph: nx.Graph, objects, image) -> int:
    group = list(
        nx.algorithms.isomorphism.GraphMatcher(graph, graph).isomorphisms_iter()
    )
    remaining = set(objects)
    count = 0
    while remaining:
        representative = min(remaining, key=str)
        orbit = {image(representative, mapping) for mapping in group}
        assert orbit <= set(objects)
        remaining -= orbit
        count += 1
    return count


def root_counts(graph: nx.Graph) -> dict[str, int]:
    branch = tuple(v for v in graph if graph.degree(v) >= 3)
    leaves = tuple(v for v in graph if graph.degree(v) == 1)
    spine = tuple(
        edge(u, v) for u, v in graph.edges()
        if graph.degree(u) >= 3 and graph.degree(v) >= 3
    )
    pendant = tuple(
        edge(u, v) for u, v in graph.edges()
        if min(graph.degree(u), graph.degree(v)) == 1
    )
    vertex_image = lambda item, mapping: mapping[item]
    edge_image = lambda item, mapping: edge(mapping[item[0]], mapping[item[1]])
    counts = {
        "branch": orbit_count(graph, branch, vertex_image),
        "leaf": orbit_count(graph, leaves, vertex_image),
        "spine_internal": orbit_count(graph, spine, edge_image) if spine else 0,
        "pendant_internal": orbit_count(graph, pendant, edge_image),
    }
    counts["total"] = sum(counts.values())
    return counts


def graph_from_primary(row: dict[str, object]) -> nx.Graph:
    graph = nx.Graph()
    graph.add_nodes_from(range(row["full_skeleton_order"]))
    graph.add_edges_from(tuple(item) for item in row["full_skeleton_edges"])
    return graph


def main() -> None:
    assert sha256(PRODUCER) == EXPECTED_PRODUCER_SHA256
    assert sha256(PRIMARY) == EXPECTED_PRIMARY_SHA256
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == (
        "PASS_EXACT_E6_SUPPRESSED_SKELETON_AND_ROOT_LOCATION_PARTITION"
    )
    assert primary["source_sha256"] == EXPECTED_PRODUCER_SHA256
    primary_graphs = [graph_from_primary(row) for row in primary["skeletons"]]
    assert len(primary_graphs) == 10
    assert all(
        not nx.is_isomorphic(first, second)
        for i, first in enumerate(primary_graphs)
        for second in primary_graphs[i + 1:]
    )

    expected_orders = (6, 8, 11, 14)
    order_counts = Counter()
    inventory_counts = Counter()
    audited_rows = []
    matched_primary = set()
    total_free_trees = 0
    orbit_totals = Counter()
    for order in expected_orders:
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(order)):
            total_free_trees += 1
            if surplus(tree) != 6:
                continue
            if any(tree.degree(v) == 2 for v in tree):
                continue
            if any(tree.degree(v) not in (1, 3, 4, 5) for v in tree):
                continue
            matches = [
                index for index, graph in enumerate(primary_graphs)
                if nx.is_isomorphic(tree, graph)
            ]
            assert len(matches) == 1
            primary_index = matches[0]
            assert primary_index not in matched_primary
            matched_primary.add(primary_index)
            counts = root_counts(tree)
            expected_counts = primary["skeletons"][primary_index][
                "root_location_partition"
            ]["counts"]
            assert counts == expected_counts
            for key, value in counts.items():
                if key != "total":
                    orbit_totals[key] += value
            branch_degrees = Counter(
                tree.degree(v) for v in tree if tree.degree(v) >= 3
            )
            inventory = (
                branch_degrees[3], branch_degrees[4], branch_degrees[5]
            )
            inventory_counts[inventory] += 1
            order_counts[order] += 1
            audited_rows.append(
                {
                    "order": order,
                    "tree_index": tree_index,
                    "graph6": nx.to_graph6_bytes(tree, header=False).decode().strip(),
                    "primary_name": primary["skeletons"][primary_index]["name"],
                    "inventory": {"b3": inventory[0], "b4": inventory[1], "b5": inventory[2]},
                    "root_orbit_counts": counts,
                }
            )

    assert matched_primary == set(range(10))
    assert order_counts == Counter({6: 1, 8: 1, 11: 4, 14: 4})
    assert inventory_counts == Counter({
        (0, 0, 1): 1,
        (0, 2, 0): 1,
        (3, 1, 0): 4,
        (6, 0, 0): 4,
    })
    assert dict(orbit_totals) == primary["classification"]["root_orbits_by_kind"]
    assert sum(orbit_totals.values()) == 101

    payload = {
        "schema": "rank8-delta03-e6-skeleton-root-partition-independent-audit-v1",
        "status": "PASS_INDEPENDENT_ALL_TREE_AUDIT_E6_SKELETON_ROOT_PARTITION",
        "method": (
            "Enumerate all unlabeled trees at the four possible suppressed orders "
            "6,8,11,14; retain exactly trees with surplus six, no degree-two vertex, "
            "and degrees in {1,3,4,5}; match each isomorphically to one producer "
            "skeleton and independently recompute vertex/edge automorphism orbits."
        ),
        "free_trees_examined": total_free_trees,
        "skeletons_found": len(audited_rows),
        "skeletons_by_order": dict(sorted(order_counts.items())),
        "skeletons_by_inventory": {
            f"b3={key[0]},b4={key[1]},b5={key[2]}": value
            for key, value in sorted(inventory_counts.items())
        },
        "root_location_orbits": sum(orbit_totals.values()),
        "root_orbits_by_kind": dict(orbit_totals),
        "rows": audited_rows,
        "dependencies": {
            PRODUCER.name: sha256(PRODUCER),
            PRIMARY.name: sha256(PRIMARY),
        },
        "scope_boundary": (
            "This independently proves the structural partition only; no Delta "
            "coefficient sign is asserted."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("FREE_TREES", total_free_trees, "SKELETONS", len(audited_rows), "ROOT_ORBITS", sum(orbit_totals.values()))
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
