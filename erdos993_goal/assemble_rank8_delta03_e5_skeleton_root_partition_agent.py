#!/usr/bin/env python3
"""Exact e=5 suppressed-skeleton, root-orbit, and boundary partition."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from collections import Counter
from pathlib import Path

import networkx as nx


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json"
TARGET_ALL_ORDER = 28
EXPECTED = {
    "rank8_delta03_e5_quartic_center_two_cubic_order27_all_roots_exact_agent_20260823.json":
        "B5D1F3C3E27B54D77A229CC2CCE3E95679523164A40A433796E6678743220A34",
    "rank8_delta03_e5_quartic_center_two_cubic_order27_all_roots_independent_audit_agent_20260823.json":
        "11CEF04556F24A4A15B3ED7250E9AE6F964ACB5F31D31366F1587966D4F9345A",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_root_order27_exact_agent_20260823.json":
        "9BC294C2738ACA7440BB1155D6C0684C7FE0AAD5BDADC835845799D85474D98E",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_root_order27_independent_audit_agent_20260823.json":
        "DD9617A133237F67878E50FBFC723CF5B378E0EAB1995D69954EC213B21270F6",
}

STATE_SPECS = {
    "pendant": {"short": tuple(range(1, 7)), "long_base": 7},
    "spine": {"short": tuple(range(1, 8)), "long_base": 8},
    "incident_pendant": {"short": tuple(range(1, 8)), "long_base": 8},
    "pendant_near_gap": {"short": tuple(range(0, 7)), "long_base": 7},
    "pendant_tail_component": {"short": tuple(range(1, 7)), "long_base": 7},
    "spine_root_gap": {"short": tuple(range(0, 7)), "long_base": 7},
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def edge(left: str, right: str) -> tuple[str, str]:
    return tuple(sorted((left, right)))


def five_cubic_path() -> nx.Graph:
    graph = nx.Graph()
    graph.add_edges_from((f"B{i}", f"B{i + 1}") for i in range(4))
    graph.add_edges_from(("B0", leaf) for leaf in ("L0a", "L0b"))
    graph.add_edge("B1", "L1")
    graph.add_edge("B2", "L2")
    graph.add_edge("B3", "L3")
    graph.add_edges_from(("B4", leaf) for leaf in ("L4a", "L4b"))
    return graph


def five_cubic_t() -> nx.Graph:
    graph = nx.Graph()
    graph.add_edges_from((("C", "A"), ("C", "B"), ("C", "M"), ("M", "D")))
    for branch, prefix in (("A", "LA"), ("B", "LB"), ("D", "LD")):
        graph.add_edge(branch, f"{prefix}a")
        graph.add_edge(branch, f"{prefix}b")
    graph.add_edge("M", "LM")
    return graph


def quartic_center_two_cubic() -> nx.Graph:
    graph = nx.Graph()
    graph.add_edges_from((("Q", "C0"), ("Q", "C1"), ("Q", "QL0"), ("Q", "QL1")))
    graph.add_edges_from(("C0", leaf) for leaf in ("C0L0", "C0L1"))
    graph.add_edges_from(("C1", leaf) for leaf in ("C1L0", "C1L1"))
    return graph


def quartic_endpoint_cubic_path() -> nx.Graph:
    graph = nx.Graph()
    graph.add_edges_from((("Q", "C0"), ("C0", "C1")))
    graph.add_edges_from(("Q", f"QL{index}") for index in range(3))
    graph.add_edge("C0", "C0L")
    graph.add_edges_from(("C1", f"C1L{index}") for index in range(2))
    return graph


SKELETONS = {
    "five_cubic_path": five_cubic_path(),
    "five_cubic_t": five_cubic_t(),
    "quartic_center_two_cubic": quartic_center_two_cubic(),
    "quartic_endpoint_cubic_path": quartic_endpoint_cubic_path(),
}

ROOT_REPRESENTATIVES = {
    "five_cubic_path": (
        ("outer_branch", "vertex", "B0"),
        ("near_inner_branch", "vertex", "B1"),
        ("center_branch", "vertex", "B2"),
        ("outer_leaf", "vertex", "L0a"),
        ("inner_leaf", "vertex", "L1"),
        ("center_leaf", "vertex", "L2"),
        ("outer_spine_internal", "edge", edge("B0", "B1")),
        ("inner_spine_internal", "edge", edge("B1", "B2")),
        ("outer_pendant_internal", "edge", edge("B0", "L0a")),
        ("inner_pendant_internal", "edge", edge("B1", "L1")),
        ("center_pendant_internal", "edge", edge("B2", "L2")),
    ),
    "five_cubic_t": (
        ("center_branch", "vertex", "C"),
        ("middle_branch", "vertex", "M"),
        ("long_outer_branch", "vertex", "D"),
        ("short_outer_branch", "vertex", "A"),
        ("middle_leaf", "vertex", "LM"),
        ("long_outer_leaf", "vertex", "LDa"),
        ("short_outer_leaf", "vertex", "LAa"),
        ("center_short_outer_spine_internal", "edge", edge("C", "A")),
        ("center_middle_spine_internal", "edge", edge("C", "M")),
        ("middle_long_outer_spine_internal", "edge", edge("M", "D")),
        ("short_outer_pendant_internal", "edge", edge("A", "LAa")),
        ("middle_pendant_internal", "edge", edge("M", "LM")),
        ("long_outer_pendant_internal", "edge", edge("D", "LDa")),
    ),
    "quartic_center_two_cubic": (
        ("central_quartic", "vertex", "Q"),
        ("cubic_branch", "vertex", "C0"),
        ("quartic_leaf", "vertex", "QL0"),
        ("cubic_leaf", "vertex", "C0L0"),
        ("center_cubic_spine_internal", "edge", edge("Q", "C0")),
        ("quartic_pendant_internal", "edge", edge("Q", "QL0")),
        ("cubic_pendant_internal", "edge", edge("C0", "C0L0")),
    ),
    "quartic_endpoint_cubic_path": (
        ("quartic_branch", "vertex", "Q"),
        ("center_cubic_branch", "vertex", "C0"),
        ("endpoint_cubic_branch", "vertex", "C1"),
        ("quartic_leaf", "vertex", "QL0"),
        ("center_cubic_leaf", "vertex", "C0L"),
        ("endpoint_cubic_leaf", "vertex", "C1L0"),
        ("quartic_center_cubic_spine_internal", "edge", edge("Q", "C0")),
        ("cubic_cubic_spine_internal", "edge", edge("C0", "C1")),
        ("quartic_pendant_internal", "edge", edge("Q", "QL0")),
        ("center_cubic_pendant_internal", "edge", edge("C0", "C0L")),
        ("endpoint_cubic_pendant_internal", "edge", edge("C1", "C1L0")),
    ),
}


def automorphisms(graph: nx.Graph) -> list[dict[str, str]]:
    return list(nx.algorithms.isomorphism.GraphMatcher(graph, graph).isomorphisms_iter())


def object_image(kind: str, root, mapping: dict[str, str]):
    if kind == "vertex":
        return mapping[root]
    return edge(mapping[root[0]], mapping[root[1]])


def object_orbits(objects, group, image) -> list[set]:
    remaining = set(objects)
    orbits = []
    while remaining:
        representative = min(remaining, key=str)
        orbit = {image(representative, mapping) for mapping in group}
        assert orbit <= remaining | (set(objects) - remaining)
        orbits.append(orbit)
        remaining -= orbit
    assert set().union(*orbits) == set(objects)
    assert sum(map(len, orbits)) == len(set(objects))
    return orbits


def edge_type(graph: nx.Graph, item: tuple[str, str]) -> str:
    return "pendant" if min(graph.degree[item[0]], graph.degree[item[1]]) == 1 else "spine"


def coordinate_system(graph: nx.Graph, root_kind: str, root):
    edges = tuple(sorted((edge(u, v) for u, v in graph.edges()), key=str))
    types = {}
    if root_kind == "vertex":
        for item in edges:
            kind = edge_type(graph, item)
            if graph.degree[root] == 1 and root in item:
                kind = "incident_pendant"
            types[("edge", item)] = kind
        return tuple(types), types, 1

    for item in edges:
        if item != root:
            types[("edge", item)] = edge_type(graph, item)
    if edge_type(graph, root) == "pendant":
        branch = next(node for node in root if graph.degree[node] > 1)
        leaf = next(node for node in root if graph.degree[node] == 1)
        types[("split", branch)] = "pendant_near_gap"
        types[("split", leaf)] = "pendant_tail_component"
        constant = 2
    else:
        types[("split", root[0])] = "spine_root_gap"
        types[("split", root[1])] = "spine_root_gap"
        constant = 3
    return tuple(sorted(types, key=str)), types, constant


def coordinate_image(slot, mapping: dict[str, str]):
    if slot[0] == "edge":
        return ("edge", edge(mapping[slot[1][0]], mapping[slot[1][1]]))
    return ("split", mapping[slot[1]])


def coordinate_cycles(slots, mapping: dict[str, str]) -> list[tuple[int, ...]]:
    indices = {slot: index for index, slot in enumerate(slots)}
    permutation = [indices[coordinate_image(slot, mapping)] for slot in slots]
    seen = set()
    cycles = []
    for start in range(len(slots)):
        if start in seen:
            continue
        current = start
        cycle = []
        while current not in seen:
            seen.add(current)
            cycle.append(current)
            current = permutation[current]
        cycles.append(tuple(cycle))
    assert sum(map(len, cycles)) == len(slots)
    return cycles


def multiply_distribution(distribution: Counter, choices) -> Counter:
    out = Counter()
    for (order, long_count), multiplicity in distribution.items():
        for add_order, add_longs in choices:
            out[(order + add_order, long_count + add_longs)] += multiplicity
    return out


def burnside_distribution(slots, types, stabilizer, constant):
    accumulated = Counter()
    signatures = Counter()
    for mapping in stabilizer:
        fixed = Counter({(constant, 0): 1})
        signature = []
        for cycle in coordinate_cycles(slots, mapping):
            kind = types[slots[cycle[0]]]
            assert all(types[slots[index]] == kind for index in cycle)
            length = len(cycle)
            signature.append((kind, length))
            specification = STATE_SPECS[kind]
            choices = [
                (length * value, 0) for value in specification["short"]
            ]
            choices.append((length * specification["long_base"], length))
            fixed = multiply_distribution(fixed, choices)
        signatures[tuple(sorted(signature))] += 1
        accumulated.update(fixed)
    assert stabilizer
    assert all(value % len(stabilizer) == 0 for value in accumulated.values())
    return Counter(
        {key: value // len(stabilizer) for key, value in accumulated.items()}
    ), signatures


def root_row(name, graph, group, label, kind, representative):
    stabilizer = [
        mapping for mapping in group
        if object_image(kind, representative, mapping) == representative
    ]
    slots, types, constant = coordinate_system(graph, kind, representative)
    distribution, signatures = burnside_distribution(slots, types, stabilizer, constant)
    coordinate_count = len(slots)
    total = sum(distribution.values())
    short_orders = Counter()
    mixed_orders = Counter()
    all_long = 0
    for (order, longs), count in distribution.items():
        if longs == 0:
            short_orders[order] += count
        elif longs == coordinate_count:
            all_long += count
        else:
            mixed_orders[order] += count
    assert all_long == 1
    all_short = sum(short_orders.values())
    mixed = total - all_short - all_long
    orbit_name = f"{name}:{label}"
    return {
        "root_location_orbit": orbit_name,
        "skeleton": name,
        "root_label": label,
        "root_kind": kind,
        "representative": representative,
        "stabilizer_order": len(stabilizer),
        "coordinate_count": coordinate_count,
        "coordinate_type_counts": dict(Counter(types.values())),
        "coordinate_patterns": total,
        "all_short_literal_patterns": all_short,
        "mixed_long_short_patterns": mixed,
        "all_long_patterns": all_long,
        "all_short_order_distribution": {
            str(order): count for order, count in sorted(short_orders.items())
        },
        "all_short_patterns_order27": short_orders[27],
        "all_short_patterns_n28_plus": sum(
            count for order, count in short_orders.items()
            if order >= TARGET_ALL_ORDER
        ),
        "all_short_maximum_order": max(short_orders),
        "mixed_baseline_order_minimum": min(mixed_orders),
        "mixed_baseline_order_maximum": max(mixed_orders),
        "cycle_index": [
            {
                "cycles": [[cycle_kind, length] for cycle_kind, length in signature],
                "automorphisms": count,
            }
            for signature, count in sorted(signatures.items(), key=str)
        ],
    }


def main() -> None:
    evidence_hashes = {name: sha256(ROOT / name) for name in EXPECTED}
    assert evidence_hashes == EXPECTED
    center_primary = json.loads(
        (ROOT / "rank8_delta03_e5_quartic_center_two_cubic_order27_all_roots_exact_agent_20260823.json")
        .read_text(encoding="utf-8")
    )
    center_audit = json.loads(
        (ROOT / "rank8_delta03_e5_quartic_center_two_cubic_order27_all_roots_independent_audit_agent_20260823.json")
        .read_text(encoding="utf-8")
    )
    endpoint_primary = json.loads(
        (ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_root_order27_exact_agent_20260823.json")
        .read_text(encoding="utf-8")
    )
    endpoint_audit = json.loads(
        (ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_root_order27_independent_audit_agent_20260823.json")
        .read_text(encoding="utf-8")
    )
    assert center_primary["proof_booleans"]["this_skeleton_all_roots_order27_Delta0_3_complete"]
    assert center_audit["proof_booleans_replayed"]["this_skeleton_all_roots_order27_Delta0_3_complete"]
    assert endpoint_primary["root_orbit"] == "quartic_branch" and endpoint_primary["order"] == 27
    assert endpoint_audit["status"].startswith("PASS_INDEPENDENT_")

    # Classification from the surplus identity e=sum binom(deg-1,2).
    contributions = {
        degree: math.comb(degree - 1, 2) for degree in range(3, 8)
    }
    degree_multisets = []
    for count3 in range(6):
        for count4 in range(3):
            for count5 in range(2):
                total = count3 + 3 * count4 + 6 * count5
                if total == 5:
                    degree_multisets.append(
                        tuple(sorted([3] * count3 + [4] * count4 + [5] * count5))
                    )
    assert sorted(degree_multisets) == [(3, 3, 3, 3, 3), (3, 3, 4)]
    five_vertex_internal_shapes = [
        tree for tree in nx.generators.nonisomorphic_trees(5)
        if max(dict(tree.degree()).values()) <= 3
    ]
    assert len(five_vertex_internal_shapes) == 2
    assert sorted(
        tuple(sorted(dict(tree.degree()).values(), reverse=True))
        for tree in five_vertex_internal_shapes
    ) == [(2, 2, 2, 1, 1), (3, 2, 1, 1, 1)]

    expected_groups = {
        "five_cubic_path": 8,
        "five_cubic_t": 16,
        "quartic_center_two_cubic": 16,
        "quartic_endpoint_cubic_path": 12,
    }
    expected_orbits = {
        "five_cubic_path": (6, 5),
        "five_cubic_t": (7, 6),
        "quartic_center_two_cubic": (4, 3),
        "quartic_endpoint_cubic_path": (6, 5),
    }
    skeleton_rows = []
    root_rows = []
    object_partitions = {}
    for name, graph in SKELETONS.items():
        assert nx.is_tree(graph)
        assert all(graph.degree[node] != 2 for node in graph)
        assert sum(math.comb(graph.degree[node] - 1, 2) for node in graph) == 5
        group = automorphisms(graph)
        assert len(group) == expected_groups[name]
        vertex_orbits = object_orbits(
            graph.nodes(), group, lambda item, mapping: mapping[item]
        )
        graph_edges = {edge(u, v) for u, v in graph.edges()}
        edge_orbits = object_orbits(
            graph_edges,
            group,
            lambda item, mapping: edge(mapping[item[0]], mapping[item[1]]),
        )
        assert (len(vertex_orbits), len(edge_orbits)) == expected_orbits[name]
        representatives = ROOT_REPRESENTATIVES[name]
        assert len(representatives) == len(vertex_orbits) + len(edge_orbits)
        used_vertex = []
        used_edge = []
        for label, kind, representative in representatives:
            candidates = vertex_orbits if kind == "vertex" else edge_orbits
            matching = [orbit for orbit in candidates if representative in orbit]
            assert len(matching) == 1
            used = used_vertex if kind == "vertex" else used_edge
            assert matching[0] not in used
            used.append(matching[0])
            root_rows.append(
                root_row(name, graph, group, label, kind, representative)
            )
        assert len(used_vertex) == len(vertex_orbits)
        assert len(used_edge) == len(edge_orbits)
        degrees = sorted((graph.degree[node] for node in graph), reverse=True)
        skeleton_rows.append({
            "skeleton": name,
            "vertices": graph.number_of_nodes(),
            "edges": graph.number_of_edges(),
            "degree_sequence": degrees,
            "automorphism_group_order": len(group),
            "vertex_root_orbits": len(vertex_orbits),
            "edge_interior_root_orbits": len(edge_orbits),
            "total_root_location_orbits": len(vertex_orbits) + len(edge_orbits),
        })
        object_partitions[name] = {
            "vertex_orbit_sizes": sorted(map(len, vertex_orbits)),
            "edge_orbit_sizes": sorted(map(len, edge_orbits)),
            "vertices_partitioned": sum(map(len, vertex_orbits)) == graph.number_of_nodes(),
            "edges_partitioned": sum(map(len, edge_orbits)) == graph.number_of_edges(),
        }

    root_names = [row["root_location_orbit"] for row in root_rows]
    assert len(root_names) == len(set(root_names)) == 42
    center_labels = {
        f"quartic_center_two_cubic:{label}"
        for label in center_primary["root_location_partition"]["suppressed_vertex_orbits"]
        + center_primary["root_location_partition"]["suppressed_edge_interior_orbits"]
    }
    assert len(center_labels) == 7 and center_labels <= set(root_names)
    endpoint_label = "quartic_endpoint_cubic_path:quartic_branch"
    assert endpoint_label in root_names
    sealed_n27 = sorted(center_labels | {endpoint_label})
    open_n27 = sorted(set(root_names) - set(sealed_n27))
    assert len(sealed_n27) == 8 and len(open_n27) == 34

    totals = {
        "suppressed_skeletons": len(skeleton_rows),
        "root_location_orbits": len(root_rows),
        "vertex_root_orbits": sum(row["vertex_root_orbits"] for row in skeleton_rows),
        "edge_interior_root_orbits": sum(row["edge_interior_root_orbits"] for row in skeleton_rows),
        "coordinate_patterns": sum(row["coordinate_patterns"] for row in root_rows),
        "all_short_literal_patterns": sum(row["all_short_literal_patterns"] for row in root_rows),
        "mixed_long_short_patterns": sum(row["mixed_long_short_patterns"] for row in root_rows),
        "all_long_patterns": sum(row["all_long_patterns"] for row in root_rows),
        "all_short_patterns_order27": sum(row["all_short_patterns_order27"] for row in root_rows),
        "all_short_patterns_n28_plus": sum(row["all_short_patterns_n28_plus"] for row in root_rows),
        "n27_root_orbits_with_sealed_evidence": len(sealed_n27),
        "n27_root_orbits_without_sealed_evidence": len(open_n27),
        "n28_plus_all_order_root_orbits_open": len(root_rows),
    }
    assert totals["suppressed_skeletons"] == 4
    assert totals["root_location_orbits"] == 42
    assert totals["vertex_root_orbits"] == 23
    assert totals["edge_interior_root_orbits"] == 19
    assert totals["coordinate_patterns"] == (
        totals["all_short_literal_patterns"]
        + totals["mixed_long_short_patterns"]
        + totals["all_long_patterns"]
    )
    assert totals["all_long_patterns"] == 42

    payload = {
        "schema": "rank8-delta03-e5-skeleton-root-partition-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E5_SKELETON_ROOT_NO_GAP_PARTITION",
        "classification_proof": {
            "surplus_identity": "e=sum_v binom(deg(v)-1,2)",
            "branch_degree_contributions": contributions,
            "partition_of_5": (
                "5=1+1+1+1+1 or 5=3+1+1; hence five cubics or one quartic plus two cubics"
            ),
            "five_cubic_internal_shapes": (
                "the two unlabeled trees on five branch vertices with maximum degree at most 3 are P5 and the degree-sequence (3,2,1,1,1) T-shape"
            ),
            "quartic_two_cubic_shapes": (
                "the branch tree is P3; its automorphism group has center and endpoint vertex orbits, giving quartic-center and quartic-endpoint placements"
            ),
        },
        "coordinate_convention": {
            "ordinary_pendant": "1..6 short or 7+A long",
            "ordinary_spine": "1..7 short or 8+S long",
            "leaf_root_incident_pendant": "1..7 short or 8+I long",
            "pendant_internal_near_gap": "0..6 short or 7+N long",
            "pendant_internal_tail_component": "1..6 short or 7+T long; selected edge length=near+1+tail",
            "spine_internal_root_gaps": "each 0..6 short or 7+G long; selected spine length=left_gap+right_gap+2",
            "offset_domain": "every long offset is an arbitrary nonnegative integer",
        },
        "target_deltas_for_ledger": [0, 1, 2, 3],
        "structural_target_orders": "n=27 evidence inventory and open all-order n>=28 families",
        "skeletons": skeleton_rows,
        "object_orbit_partition_checks": object_partitions,
        "root_location_partitions": root_rows,
        "nested_order27_evidence": {
            "sealed_root_orbits": sealed_n27,
            "quartic_center_two_cubic_all_seven": {
                "primary": "rank8_delta03_e5_quartic_center_two_cubic_order27_all_roots_exact_agent_20260823.json",
                "primary_sha256": evidence_hashes["rank8_delta03_e5_quartic_center_two_cubic_order27_all_roots_exact_agent_20260823.json"],
                "independent_audit": "rank8_delta03_e5_quartic_center_two_cubic_order27_all_roots_independent_audit_agent_20260823.json",
                "independent_audit_sha256": evidence_hashes["rank8_delta03_e5_quartic_center_two_cubic_order27_all_roots_independent_audit_agent_20260823.json"],
            },
            "quartic_endpoint_quartic_branch_only": {
                "root_orbit": endpoint_label,
                "primary": "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_root_order27_exact_agent_20260823.json",
                "primary_sha256": evidence_hashes["rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_root_order27_exact_agent_20260823.json"],
                "independent_audit": "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_root_order27_independent_audit_agent_20260823.json",
                "independent_audit_sha256": evidence_hashes["rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_root_order27_independent_audit_agent_20260823.json"],
            },
        },
        "remaining_obligations": {
            "n27_root_orbits_without_sealed_evidence": open_n27,
            "n28_plus_all_order_root_orbits": sorted(root_names),
            "n28_plus_note": (
                "No existing n=27 finite census supplies an induction or all-order sign theorem; all 42 structural root families remain open for n>=28."
            ),
        },
        "totals": totals,
        "no_gap_no_overlap_reason": (
            "The surplus partition exhausts branch-degree multisets; the internal branch-tree classification exhausts unlabeled placements; full automorphism orbits partition every suppressed vertex and edge; vertex roots and open-edge-interior roots are disjoint; and every coordinate lies in exactly one short literal or long base-plus-offset state."
        ),
        "immutable_evidence_hashes": evidence_hashes,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Exact topology/root/coordinate partition and evidence ledger only. No new Delta sign claim, e=5 closure, connected-Q8 closure, forest-Q8 closure, PGC closure, or Problem 993 solution."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SKELETONS", [(row["skeleton"], row["total_root_location_orbits"]) for row in skeleton_rows])
    print("TOTALS", totals)
    print("N27_SEALED", len(sealed_n27), "N27_OPEN", len(open_n27), "N28PLUS_OPEN", len(root_names))
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
