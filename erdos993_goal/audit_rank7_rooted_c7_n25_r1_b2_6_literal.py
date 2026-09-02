#!/usr/bin/env python3
"""Independent audit of the exact n=25,r=1,B2=6 literal profile scan."""

from __future__ import annotations

import hashlib
import json
from collections import Counter
from itertools import combinations
from math import comb
from pathlib import Path

import networkx as nx
from networkx.algorithms.isomorphism import categorical_node_match


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "enumerate_rank7_rooted_c7_n25_r1_b2_6_literal.cpp"
BINARY = ROOT / "enumerate_rank7_rooted_c7_n25_r1_b2_6_literal.exe"
REPORT = ROOT / "rank7_rooted_c7_n25_r1_b2_6_literal_exact_20260820.json"
OUTPUT = ROOT / "rank7_rooted_c7_n25_r1_b2_6_literal_independent_audit_exact_20260820.json"

EXPECTED_SOURCE_SHA256 = "EE59B3CBD71D66E24F9BECADFC5F815ABEF55736B508DEF2FB5611A732D74C67"
EXPECTED_BINARY_SHA256 = "0320065288937A2E2EE55D3A53A34F107B0E7AC4485F2B5C7E04547CF9794C40"
EXPECTED_REPORT_SHA256 = "4E3E5DB8B9EB3FC1A055E12B297AEB0FAB80D2FB0652948DB5C6ED7367ED79EA"

MANIFEST = {
    "internal_path_P6": {
        "edges": [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5)],
        "root_representatives": [0, 1, 2],
    },
    "internal_double_star_33": {
        "edges": [(0, 1), (0, 2), (0, 3), (1, 4), (1, 5)],
        "root_representatives": [2],
    },
    "internal_three_arms_311": {
        "edges": [(0, 1), (1, 2), (2, 3), (0, 4), (0, 5)],
        "root_representatives": [1, 2, 3, 4],
    },
    "internal_three_arms_221": {
        "edges": [(0, 1), (1, 2), (0, 3), (3, 4), (0, 5)],
        "root_representatives": [1, 2, 5],
    },
}


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def rooted_copy(graph: nx.Graph, root: int) -> nx.Graph:
    result = graph.copy()
    nx.set_node_attributes(result, False, "root")
    result.nodes[root]["root"] = True
    return result


def rooted_isomorphic(left: nx.Graph, right: nx.Graph) -> bool:
    return nx.is_isomorphic(
        left,
        right,
        node_match=categorical_node_match("root", False),
    )


def audit_skeleton_completeness() -> dict:
    all_free = list(nx.nonisomorphic_trees(6))
    eligible = [graph for graph in all_free if max(dict(graph.degree()).values()) <= 3]
    assert len(all_free) == 6
    assert len(eligible) == 4

    manifest_graphs = []
    rooted_counts = {}
    rooted_total = 0
    for name, description in MANIFEST.items():
        graph = nx.Graph(description["edges"])
        assert nx.is_tree(graph)
        assert set(graph) == set(range(6))
        assert max(dict(graph.degree()).values()) <= 3
        manifest_graphs.append(graph)

        candidates = [vertex for vertex in graph if graph.degree(vertex) <= 2]
        representatives = description["root_representatives"]
        rooted_representatives = [rooted_copy(graph, vertex) for vertex in representatives]
        assert all(graph.degree(vertex) <= 2 for vertex in representatives)
        for i, left in enumerate(rooted_representatives):
            for right in rooted_representatives[i + 1 :]:
                assert not rooted_isomorphic(left, right)
        for vertex in candidates:
            marked = rooted_copy(graph, vertex)
            assert sum(rooted_isomorphic(marked, representative) for representative in rooted_representatives) == 1
        rooted_counts[name] = len(representatives)
        rooted_total += len(representatives)

    for i, left in enumerate(manifest_graphs):
        for right in manifest_graphs[i + 1 :]:
            assert not nx.is_isomorphic(left, right)
    for graph in eligible:
        assert sum(nx.is_isomorphic(graph, candidate) for candidate in manifest_graphs) == 1
    assert rooted_counts == {
        "internal_path_P6": 3,
        "internal_double_star_33": 1,
        "internal_three_arms_311": 4,
        "internal_three_arms_221": 3,
    }
    assert rooted_total == 11
    return {
        "free_internal_trees_order6": 6,
        "maximum_degree_at_most3_shapes": 4,
        "manifest_is_exact_shape_transversal": True,
        "rooted_leaf_orbits_by_shape": rooted_counts,
        "rooted_leaf_orbits": rooted_total,
        "root_orbit_reason": (
            "each cubic-skeleton leaf is attached to an internal vertex of "
            "degree at most two; leaves at the same internal vertex are symmetric"
        ),
    }


def build_rooted_skeleton(name: str, root_internal: int):
    internal_edges = MANIFEST[name]["edges"]
    degrees = Counter(vertex for edge in internal_edges for vertex in edge)
    edges = list(internal_edges)
    root_leaf = root_edge = None
    next_leaf = 6
    for vertex in range(6):
        for _ in range(3 - degrees[vertex]):
            leaf = next_leaf
            next_leaf += 1
            edges.append((vertex, leaf))
            if vertex == root_internal and root_leaf is None:
                root_leaf = leaf
                root_edge = len(edges) - 1
    assert next_leaf == 14
    assert len(edges) == 13
    assert root_leaf is not None and root_edge is not None
    return edges, root_leaf, root_edge


def build_subdivision_tree(rooted_name: str, subdivisions: list[int]):
    marker = "_root_at_internal_"
    name, root_text = rooted_name.rsplit(marker, 1)
    root_internal = int(root_text)
    edges, root_leaf, root_edge = build_rooted_skeleton(name, root_internal)
    assert len(subdivisions) == 13
    assert sum(subdivisions) == 11
    assert subdivisions[root_edge] >= 1
    graph = nx.Graph()
    graph.add_nodes_from(range(14))
    next_vertex = 14
    for (left, right), count in zip(edges, subdivisions):
        previous = left
        for _ in range(count):
            graph.add_edge(previous, next_vertex)
            previous = next_vertex
            next_vertex += 1
        graph.add_edge(previous, right)
    assert next_vertex == 25
    assert nx.is_tree(graph)
    support = next(iter(graph.neighbors(root_leaf)))
    return graph, root_leaf, support


def independent_counts(graph: nx.Graph, vertices: list[int], ranks: tuple[int, ...]) -> dict[int, int]:
    allowed = set(vertices)
    adjacency = {
        vertex: set(graph.neighbors(vertex)) & allowed
        for vertex in vertices
    }
    counts = {}
    for rank in ranks:
        count = 0
        for chosen in combinations(vertices, rank):
            selected = set(chosen)
            if all(not (adjacency[vertex] & selected) for vertex in chosen):
                count += 1
        counts[rank] = count
    return counts


def audit_minimum_witness(report: dict) -> dict:
    witness = report["minimum_witness"]
    graph, root, support = build_subdivision_tree(
        witness["rooted_skeleton"],
        witness["subdivisions_in_skeleton_edge_order"],
    )
    degrees = Counter(dict(graph.degree()).values())
    assert degrees == {1: 8, 2: 11, 3: 6}
    positive_excess = sorted(
        (degree - 1 for _, degree in graph.degree() if degree > 1),
        reverse=True,
    )
    assert positive_excess == [2] * 6 + [1] * 11
    assert graph.degree(root) == 1
    assert graph.degree(support) == 2
    b2 = sum(comb(degree - 1, 2) for _, degree in graph.degree())
    assert b2 == 6

    all_vertices = sorted(graph)
    h_vertices = [vertex for vertex in all_vertices if vertex != root]
    g_vertices = [vertex for vertex in all_vertices if vertex not in (root, support)]
    c = independent_counts(graph, all_vertices, (5, 6, 7))
    h = independent_counts(graph, h_vertices, (5, 6, 7))
    g = independent_counts(graph, g_vertices, (4, 5, 6))
    assert c[5] == h[5] + g[4]
    assert c[6] == h[6] + g[5]
    assert c[7] == h[7] + g[6]
    assert {f"c{rank}": c[rank] for rank in (5, 6, 7)} == {
        "c5": witness["c5"], "c6": witness["c6"], "c7": witness["c7"]
    }
    assert {f"h{rank}": h[rank] for rank in (5, 6, 7)} == {
        "h5": witness["h5"], "h6": witness["h6"], "h7": witness["h7"]
    }
    assert {f"g{rank}": g[rank] for rank in (4, 5, 6)} == {
        "g4": witness["g4"], "g5": witness["g5"], "g6": witness["g6"]
    }
    rooted_c7 = c[5] * (c[6] ** 2 - c[5] * c[7]) - 2 * c[6] * (
        c[6] * h[5] - c[5] * h[6]
    )
    assert rooted_c7 == witness["rooted_C7"] == report["minimum_rooted_C7"]
    assert rooted_c7 == 6_714_591_315_160
    return {
        "degree_sequence": {str(key): value for key, value in sorted(degrees.items())},
        "B2": b2,
        "root_degree": graph.degree(root),
        "root_support_excess": graph.degree(support) - 1,
        "full_tree_independent_counts": {str(key): value for key, value in c.items()},
        "root_deleted_independent_counts": {str(key): value for key, value in h.items()},
        "root_and_support_deleted_counts": {str(key): value for key, value in g.items()},
        "deletion_identity_checked": "c_k=h_k+g_(k-1), k=5,6,7",
        "rooted_C7_recomputed_by_direct_subset_enumeration": rooted_c7,
    }


def audit_report(report: dict) -> dict:
    assert report["schema"] == "rank7-rooted-c7-n25-r1-b2-6-literal-v1"
    assert report["status"] == "PASS_EXACT_LITERAL_PROFILE_C7_POSITIVE"
    assert report["scope"] == {
        "n": 25,
        "root_degree": 1,
        "B2": 6,
        "positive_excess_partition": [2] * 6 + [1] * 11,
        "root_support_excess": 1,
    }
    assert report["structural_reduction"] == {
        "degree_sequence": "3^6,2^11,1^8",
        "internal_tree_shapes": 4,
        "rooted_leaf_orbits": 11,
        "skeleton_edges": 13,
        "subdivisions": 11,
        "root_edge_minimum_subdivisions": 1,
        "weak_compositions_per_rooted_orbit": comb(22, 12),
    }
    assert comb(22, 12) == 646_646
    assert report["counts"] == {
        "assignments": 7_113_106,
        "positive": 7_113_106,
        "zero": 0,
        "negative": 0,
    }
    assert len(report["rooted_orbits"]) == 11
    expected_names = {
        f"{name}_root_at_internal_{root}"
        for name, description in MANIFEST.items()
        for root in description["root_representatives"]
    }
    observed_names = {row["name"] for row in report["rooted_orbits"]}
    assert observed_names == expected_names
    assert len(observed_names) == 11
    for row in report["rooted_orbits"]:
        assert row["assignments"] == 646_646
        assert row["positive"] == 646_646
        assert row["zero"] == row["negative"] == 0
        assert row["minimum_rooted_C7"] > 0
        assert row["minimum_multiplicity"] >= 1
        assert row["minimum_witness"]["rooted_skeleton"] == row["name"]
        assert row["minimum_witness"]["rooted_C7"] == row["minimum_rooted_C7"]
    assert report["minimum_rooted_C7"] == min(
        row["minimum_rooted_C7"] for row in report["rooted_orbits"]
    )
    assert report["minimum_witness"]["rooted_skeleton"] in expected_names
    assert report["ordered_result_fnv1a64"] == "21CA5F7B0D6805F1"
    return {
        "rooted_orbit_rows": 11,
        "assignments_per_orbit": 646_646,
        "total_assignments": 7_113_106,
        "positive": 7_113_106,
        "zero": 0,
        "negative": 0,
        "minimum_rooted_C7": report["minimum_rooted_C7"],
        "ordered_result_fnv1a64": report["ordered_result_fnv1a64"],
        "all_orbit_minima_strictly_positive": True,
    }


def main() -> int:
    hashes = {
        "enumerator_source_sha256": sha(SOURCE),
        "compiled_binary_sha256": sha(BINARY),
        "source_report_sha256": sha(REPORT),
    }
    assert hashes == {
        "enumerator_source_sha256": EXPECTED_SOURCE_SHA256,
        "compiled_binary_sha256": EXPECTED_BINARY_SHA256,
        "source_report_sha256": EXPECTED_REPORT_SHA256,
    }
    report = json.loads(REPORT.read_text(encoding="utf-8"))
    output = {
        "schema": "rank7-rooted-c7-n25-r1-b2-6-literal-independent-audit-v1",
        "status": "PASS_INDEPENDENT_EXACT_LITERAL_PROFILE_AUDIT",
        "hash_integrity": hashes,
        "skeleton_completeness": audit_skeleton_completeness(),
        "source_report_integrity": audit_report(report),
        "minimum_witness_independent_bruteforce": audit_minimum_witness(report),
        "scope_guard": (
            "This closes the exact named literal profile family only; it is "
            "not a full order-25 census or a universal rooted-C7 theorem."
        ),
    }
    OUTPUT.write_text(json.dumps(output, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(output["status"])
    print("skeleton shapes=4 rooted orbits=11 assignments=7113106")
    print("minimum rooted C7=6714591315160")
    print("output", OUTPUT.name, sha(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
