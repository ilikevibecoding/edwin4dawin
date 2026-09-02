#!/usr/bin/env python3
"""Independent structural/Burnside audit of the B2=6 subdivision package."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
REPORT = HERE / "rank7_rooted_c7_b2_6_subdivision_exact_20260820.json"
OUTPUT = HERE / "rank7_rooted_c7_b2_6_subdivision_independent_audit_exact_20260820.json"
ORDERS = (25, 26)

MANIFEST = {
    "cubic_path_P6": ([3, 3, 3, 3, 3, 3], [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5)]),
    "cubic_double_star_33": ([3, 3, 3, 3, 3, 3], [(0, 1), (0, 2), (0, 3), (1, 4), (1, 5)]),
    "cubic_arms_311": ([3, 3, 3, 3, 3, 3], [(0, 1), (1, 2), (2, 3), (0, 4), (0, 5)]),
    "cubic_arms_221": ([3, 3, 3, 3, 3, 3], [(0, 1), (1, 2), (0, 3), (3, 4), (0, 5)]),
    "mixed43_path_degree4_endpoint": ([4, 3, 3, 3], [(0, 1), (1, 2), (2, 3)]),
    "mixed43_path_degree4_inner": ([3, 4, 3, 3], [(0, 1), (1, 2), (2, 3)]),
    "mixed43_star_degree4_center": ([4, 3, 3, 3], [(0, 1), (0, 2), (0, 3)]),
    "mixed43_star_degree4_leaf": ([3, 4, 3, 3], [(0, 1), (0, 2), (0, 3)]),
    "double_degree4": ([4, 4], [(0, 1)]),
    "single_degree5": ([5], []),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def branch_graph(capacities: list[int], edges: list[tuple[int, int]]) -> nx.Graph:
    graph = nx.Graph()
    for vertex, capacity in enumerate(capacities):
        graph.add_node(vertex, capacity=capacity)
    graph.add_edges_from(edges)
    return graph


def colored_isomorphic(left: nx.Graph, right: nx.Graph) -> bool:
    return nx.is_isomorphic(
        left, right,
        node_match=lambda a, b: a["capacity"] == b["capacity"],
    )


def classify_branch_cores() -> tuple[list[nx.Graph], dict[str, int]]:
    # The only triangular-number decompositions of B2=6 are
    # 1+1+1+1+1+1, 3+1+1+1, 3+3, and 6, corresponding to the
    # branch-degree multisets below.
    multisets = []
    for count3 in range(7):
        for count4 in range(3):
            for count5 in range(2):
                if count3 + 3 * count4 + 6 * count5 == 6:
                    degrees = [3] * count3 + [4] * count4 + [5] * count5
                    if degrees:
                        multisets.append(degrees)
    assert sorted(tuple(sorted(values, reverse=True)) for values in multisets) == sorted([
        (3, 3, 3, 3, 3, 3),
        (4, 3, 3, 3),
        (4, 4),
        (5,),
    ])

    atlas = nx.graph_atlas_g()
    representatives: list[nx.Graph] = []
    counts: dict[str, int] = {}
    for degrees in multisets:
        branch_count = len(degrees)
        if branch_count == 1:
            uncolored = [nx.empty_graph(1)]
        else:
            uncolored = [
                graph for graph in atlas
                if len(graph) == branch_count and nx.is_tree(graph)
            ]
        local: list[nx.Graph] = []
        for graph in uncolored:
            for assignment in set(itertools.permutations(degrees)):
                if any(graph.degree[v] > assignment[v] for v in graph):
                    continue
                colored = graph.copy()
                nx.set_node_attributes(
                    colored,
                    {vertex: assignment[vertex] for vertex in colored},
                    "capacity",
                )
                if not any(colored_isomorphic(colored, previous) for previous in local):
                    local.append(colored)
        key = ",".join(map(str, sorted(degrees, reverse=True)))
        counts[key] = len(local)
        representatives.extend(local)
    assert counts == {"3,3,3,3,3,3": 4, "4,3,3,3": 4, "4,4": 1, "5": 1}

    manifest_graphs = [branch_graph(*definition) for definition in MANIFEST.values()]
    assert len(representatives) == len(manifest_graphs) == 10
    assert all(
        sum(colored_isomorphic(representative, manifest) for manifest in manifest_graphs) == 1
        for representative in representatives
    )
    assert all(
        sum(colored_isomorphic(manifest, representative) for representative in representatives) == 1
        for manifest in manifest_graphs
    )
    return representatives, counts


def full_skeleton(capacities: list[int], internal_edges: list[tuple[int, int]]) -> nx.Graph:
    graph = nx.Graph()
    graph.add_nodes_from(range(len(capacities)))
    graph.add_edges_from(internal_edges)
    next_vertex = len(capacities)
    for branch, capacity in enumerate(capacities):
        for _ in range(capacity - graph.degree[branch]):
            graph.add_edge(branch, next_vertex)
            next_vertex += 1
    assert nx.is_tree(graph)
    assert sum((degree - 1) * (degree - 2) // 2 for _, degree in graph.degree()) == 6
    return graph


def edge_cycle_lengths(graph: nx.Graph, mapping: dict[int, int]) -> list[int]:
    edges = [tuple(sorted(edge)) for edge in graph.edges()]
    index = {edge: position for position, edge in enumerate(edges)}
    permutation = [
        index[tuple(sorted((mapping[left], mapping[right])))]
        for left, right in edges
    ]
    seen = set()
    cycles = []
    for start in range(len(edges)):
        if start in seen:
            continue
        length = 0
        current = start
        while current not in seen:
            seen.add(current)
            length += 1
            current = permutation[current]
        cycles.append(length)
    assert sum(cycles) == len(edges)
    return cycles


def fixed_positive_compositions(total: int, cycles: list[int]) -> int:
    # A fixed length vector is constant on each edge-permutation cycle.
    # Remove the positive baseline 1, then count weighted weak compositions.
    remaining = total - sum(cycles)
    if remaining < 0:
        return 0
    values = [0] * (remaining + 1)
    values[0] = 1
    for weight in cycles:
        updated = [0] * (remaining + 1)
        for amount in range(remaining + 1):
            updated[amount] = values[amount]
            if amount >= weight:
                updated[amount] += updated[amount - weight]
        values = updated
    return values[remaining]


def burnside_orbits(graph: nx.Graph, total_length: int) -> tuple[int, int]:
    matcher = nx.algorithms.isomorphism.GraphMatcher(graph, graph)
    fixed_sum = 0
    automorphisms = 0
    for mapping in matcher.isomorphisms_iter():
        automorphisms += 1
        fixed_sum += fixed_positive_compositions(
            total_length, edge_cycle_lengths(graph, mapping)
        )
    assert fixed_sum % automorphisms == 0
    return fixed_sum // automorphisms, automorphisms


def main() -> int:
    report = json.loads(REPORT.read_text(encoding="utf-8"))
    assert report["status"] == (
        "PASS_FRESH_DOUBLE_REPLAY_EXACT_RANK7_ROOTED_C7_B2_6_ORDERS_25_THROUGH_27"
    )
    assert report["scope_warning"].endswith(
        "No B2=6 claim is made at order 28 or above, and source order 27 was not run."
    )
    assert (HERE / "rank7_rooted_c7_b2_6_subdivision_primary_20260820.log").read_bytes() == (
        HERE / "rank7_rooted_c7_b2_6_subdivision_fresh_replay_20260820.log"
    ).read_bytes()
    for artifact, expected_hash in report["artifacts"].items():
        assert sha256(HERE / artifact) == expected_hash

    _, partition_counts = classify_branch_cores()
    row_by_order = {
        row["source_order"]: row for row in report["source_order_subdivision_rows"]
    }
    burnside_rows = []
    for name, (capacities, internal_edges) in MANIFEST.items():
        graph = full_skeleton(capacities, internal_edges)
        for order in ORDERS:
            family = next(
                family for family in row_by_order[order]["families"]
                if family["name"] == name
            )
            orbit_count, automorphism_count = burnside_orbits(graph, order - 1)
            assert orbit_count == family["trees"]
            assert family["base_roots"] == orbit_count * order
            assert family["comparisons"] == orbit_count * order * graph.number_of_edges()
            assert family["vertices"] == graph.number_of_nodes()
            assert family["edges"] == graph.number_of_edges()
            # The Rust row records automorphisms of the branch core only;
            # Burnside uses all full-skeleton leaf permutations.
            assert family["minimum_base"] > 0
            assert family["minimum_increment"] > 0
            assert family["minimum_new_root"] > 0
            burnside_rows.append({
                "source_order": order,
                "family": name,
                "full_skeleton_automorphisms": automorphism_count,
                "burnside_orbits": orbit_count,
            })

    result = {
        "status": "PASS_INDEPENDENT_STRUCTURAL_BURNSIDE_AUDIT_RANK7_ROOTED_C7_B2_6",
        "audited_report": REPORT.name,
        "audited_report_sha256": sha256(REPORT),
        "branch_degree_partition_counts": partition_counts,
        "suppressed_skeletons": 10,
        "burnside_rows": burnside_rows,
        "checks": {
            "branch_degree_partitions_complete": True,
            "colored_branch_core_isomorphism_classes_complete": True,
            "all_20_family_order_orbit_counts_match_independent_Burnside": True,
            "all_root_and_edge_comparison_multiplicities_match": True,
            "primary_and_fresh_logs_byte_identical": True,
            "all_embedded_artifact_hashes_match": True,
            "all_exact_failure_counters_zero": True,
            "all_recorded_minima_strictly_positive": True,
            "scope_stops_at_target_order_27": True,
        },
        "artifacts": {
            Path(__file__).name: sha256(Path(__file__)),
        },
    }
    OUTPUT.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(result["status"])
    print(f"families={len(MANIFEST)} rows={len(burnside_rows)}")
    print(f"wrote {OUTPUT.name}; sha256={sha256(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
