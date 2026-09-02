#!/usr/bin/env python3
"""Exact e=4 suppressed-skeleton/root-orbit and boundary partition."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from collections import Counter
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta03_e4_skeleton_root_partition_exact_agent_20260823.json"
TARGET_ORDER = 27

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


def edge(u, v):
    return tuple(sorted((u, v)))


def cubic_star():
    graph = nx.Graph()
    for index in range(3):
        graph.add_edge("C", f"B{index}")
        graph.add_edge(f"B{index}", f"L{index}a")
        graph.add_edge(f"B{index}", f"L{index}b")
    return graph


def cubic_path():
    graph = nx.Graph()
    graph.add_edges_from((("B0", "B1"), ("B1", "B2"), ("B2", "B3")))
    graph.add_edges_from((("B0", "L0a"), ("B0", "L0b"), ("B1", "L1"), ("B2", "L2"), ("B3", "L3a"), ("B3", "L3b")))
    return graph


def quartic_cubic():
    graph = nx.Graph()
    graph.add_edge("Q", "C")
    graph.add_edges_from(("Q", f"QL{i}") for i in range(3))
    graph.add_edges_from(("C", f"CL{i}") for i in range(2))
    return graph


SKELETONS = {
    "four_cubic_star": cubic_star(),
    "four_cubic_path": cubic_path(),
    "quartic_cubic_bistar": quartic_cubic(),
}

ROOT_REPRESENTATIVES = {
    "four_cubic_star": (
        ("center_branch", "vertex", "C"),
        ("outer_branch", "vertex", "B0"),
        ("leaf", "vertex", "L0a"),
        ("center_outer_spine_internal", "edge", edge("C", "B0")),
        ("pendant_internal", "edge", edge("B0", "L0a")),
    ),
    "four_cubic_path": (
        ("outer_branch", "vertex", "B0"),
        ("inner_branch", "vertex", "B1"),
        ("outer_leaf", "vertex", "L0a"),
        ("inner_leaf", "vertex", "L1"),
        ("outer_spine_internal", "edge", edge("B0", "B1")),
        ("middle_spine_internal", "edge", edge("B1", "B2")),
        ("outer_pendant_internal", "edge", edge("B0", "L0a")),
        ("inner_pendant_internal", "edge", edge("B1", "L1")),
    ),
    "quartic_cubic_bistar": (
        ("quartic_branch", "vertex", "Q"),
        ("cubic_branch", "vertex", "C"),
        ("quartic_leaf", "vertex", "QL0"),
        ("cubic_leaf", "vertex", "CL0"),
        ("central_spine_internal", "edge", edge("Q", "C")),
        ("quartic_pendant_internal", "edge", edge("Q", "QL0")),
        ("cubic_pendant_internal", "edge", edge("C", "CL0")),
    ),
}


def automorphisms(graph):
    return list(nx.algorithms.isomorphism.GraphMatcher(graph, graph).isomorphisms_iter())


def object_image(root_kind, root, mapping):
    if root_kind == "vertex":
        return mapping[root]
    return edge(mapping[root[0]], mapping[root[1]])


def object_orbits(objects, group, image):
    remaining = set(objects)
    rows = []
    while remaining:
        representative = min(remaining, key=str)
        orbit = {image(representative, mapping) for mapping in group}
        rows.append(orbit)
        remaining -= orbit
    return rows


def edge_type(graph, item):
    u, v = item
    return "pendant" if min(graph.degree[u], graph.degree[v]) == 1 else "spine"


def coordinate_system(graph, root_kind, root):
    all_edges = tuple(sorted((edge(u, v) for u, v in graph.edges()), key=str))
    coordinate_types = {}
    if root_kind == "vertex":
        for item in all_edges:
            kind = edge_type(graph, item)
            if graph.degree[root] == 1 and root in item:
                kind = "incident_pendant"
            coordinate_types[("edge", item)] = kind
        return tuple(coordinate_types), coordinate_types, 1

    target = root
    kind = edge_type(graph, target)
    for item in all_edges:
        if item != target:
            coordinate_types[("edge", item)] = edge_type(graph, item)
    if kind == "pendant":
        branch = next(vertex for vertex in target if graph.degree[vertex] > 1)
        leaf = next(vertex for vertex in target if graph.degree[vertex] == 1)
        coordinate_types[("split", branch)] = "pendant_near_gap"
        coordinate_types[("split", leaf)] = "pendant_tail_component"
        constant = 2
    else:
        coordinate_types[("split", target[0])] = "spine_root_gap"
        coordinate_types[("split", target[1])] = "spine_root_gap"
        constant = 3
    return tuple(sorted(coordinate_types, key=str)), coordinate_types, constant


def coordinate_image(slot, mapping):
    if slot[0] == "edge":
        return ("edge", edge(mapping[slot[1][0]], mapping[slot[1][1]]))
    return ("split", mapping[slot[1]])


def cycles_for(slots, mapping):
    index = {slot: i for i, slot in enumerate(slots)}
    permutation = [index[coordinate_image(slot, mapping)] for slot in slots]
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
    return cycles


def multiply_distribution(distribution, choices):
    out = Counter()
    for (order, longs), multiplicity in distribution.items():
        for add_order, add_longs in choices:
            out[(order + add_order, longs + add_longs)] += multiplicity
    return out


def burnside_distribution(slots, types, stabilizer, order_constant):
    accumulated = Counter()
    signatures = Counter()
    for mapping in stabilizer:
        cycles = cycles_for(slots, mapping)
        signature = []
        fixed = Counter({(order_constant, 0): 1})
        for cycle in cycles:
            kind = types[slots[cycle[0]]]
            assert all(types[slots[index]] == kind for index in cycle)
            length = len(cycle)
            signature.append((kind, length))
            spec = STATE_SPECS[kind]
            choices = [(length * value, 0) for value in spec["short"]]
            choices.append((length * spec["long_base"], length))
            fixed = multiply_distribution(fixed, choices)
        signatures[tuple(sorted(signature))] += 1
        accumulated.update(fixed)
    size = len(stabilizer)
    assert all(value % size == 0 for value in accumulated.values())
    return Counter({key: value // size for key, value in accumulated.items()}), signatures


def root_row(skeleton_name, graph, group, label, root_kind, root):
    stabilizer = [mapping for mapping in group if object_image(root_kind, root, mapping) == root]
    slots, types, constant = coordinate_system(graph, root_kind, root)
    distribution, signatures = burnside_distribution(slots, types, stabilizer, constant)
    coordinates = len(slots)
    total = sum(distribution.values())
    all_short = sum(value for (order, longs), value in distribution.items() if longs == 0)
    all_long = sum(value for (order, longs), value in distribution.items() if longs == coordinates)
    mixed = total - all_short - all_long
    assert all_long == 1
    short_orders = Counter()
    mixed_orders = Counter()
    for (order, longs), count in distribution.items():
        if longs == 0:
            short_orders[order] += count
        elif 0 < longs < coordinates:
            mixed_orders[order] += count
    return {
        "root_location_orbit": f"{skeleton_name}:{label}",
        "skeleton": skeleton_name,
        "root_label": label,
        "root_kind": root_kind,
        "representative": root,
        "stabilizer_order": len(stabilizer),
        "coordinate_count": coordinates,
        "coordinate_type_counts": dict(Counter(types.values())),
        "coordinate_patterns": total,
        "all_short_literal_patterns": all_short,
        "mixed_long_short_patterns": mixed,
        "all_long_patterns": all_long,
        "all_short_order_distribution": {str(k): v for k, v in sorted(short_orders.items())},
        "all_short_patterns_n27_plus": sum(v for k, v in short_orders.items() if k >= TARGET_ORDER),
        "all_short_maximum_order": max(short_orders),
        "mixed_baseline_order_minimum": min(mixed_orders),
        "mixed_baseline_order_maximum": max(mixed_orders),
        "cycle_index": [
            {"cycles": [[kind, length] for kind, length in signature], "automorphisms": count}
            for signature, count in sorted(signatures.items(), key=str)
        ],
    }


def main() -> None:
    skeleton_rows = []
    root_rows = []
    expected_groups = {"four_cubic_star": 48, "four_cubic_path": 8, "quartic_cubic_bistar": 12}
    expected_root_orbits = {"four_cubic_star": (3, 2), "four_cubic_path": (4, 4), "quartic_cubic_bistar": (4, 3)}
    for name, graph in SKELETONS.items():
        assert nx.is_tree(graph)
        surplus = sum(math.comb(graph.degree[node] - 1, 2) for node in graph)
        assert surplus == 4
        group = automorphisms(graph)
        assert len(group) == expected_groups[name]
        vertex_orbits = object_orbits(graph.nodes(), group, lambda item, mapping: mapping[item])
        edge_objects = {edge(u, v) for u, v in graph.edges()}
        edge_orbits = object_orbits(edge_objects, group, lambda item, mapping: edge(mapping[item[0]], mapping[item[1]]))
        assert (len(vertex_orbits), len(edge_orbits)) == expected_root_orbits[name]
        representatives = ROOT_REPRESENTATIVES[name]
        assert len(representatives) == len(vertex_orbits) + len(edge_orbits)
        # Each manual representative selects exactly one independently found orbit.
        selected_vertex_orbits = []
        selected_edge_orbits = []
        for label, kind, root in representatives:
            matching = [orbit for orbit in (vertex_orbits if kind == "vertex" else edge_orbits) if root in orbit]
            assert len(matching) == 1
            target = selected_vertex_orbits if kind == "vertex" else selected_edge_orbits
            assert matching[0] not in target
            target.append(matching[0])
            root_rows.append(root_row(name, graph, group, label, kind, root))
        assert len(selected_vertex_orbits) == len(vertex_orbits)
        assert len(selected_edge_orbits) == len(edge_orbits)
        degrees = sorted((graph.degree[node] for node in graph), reverse=True)
        skeleton_rows.append({
            "skeleton": name,
            "vertices": graph.number_of_nodes(),
            "edges": graph.number_of_edges(),
            "degree_sequence": degrees,
            "automorphism_group_order": len(group),
            "vertex_root_orbits": len(vertex_orbits),
            "internal_edge_root_orbits": len(edge_orbits),
            "total_root_location_orbits": len(vertex_orbits) + len(edge_orbits),
        })

    totals = {
        "suppressed_skeletons": len(skeleton_rows),
        "root_location_orbits": len(root_rows),
        "coordinate_patterns": sum(row["coordinate_patterns"] for row in root_rows),
        "all_short_literal_patterns": sum(row["all_short_literal_patterns"] for row in root_rows),
        "mixed_long_short_patterns": sum(row["mixed_long_short_patterns"] for row in root_rows),
        "all_long_patterns": sum(row["all_long_patterns"] for row in root_rows),
        "all_short_patterns_n27_plus": sum(row["all_short_patterns_n27_plus"] for row in root_rows),
    }
    assert totals["suppressed_skeletons"] == 3 and totals["root_location_orbits"] == 20
    assert totals["coordinate_patterns"] == totals["all_short_literal_patterns"] + totals["mixed_long_short_patterns"] + totals["all_long_patterns"]
    assert totals["all_long_patterns"] == 20

    payload = {
        "schema": "rank8-delta03-e4-skeleton-root-partition-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E4_SKELETON_ROOT_NO_GAP_PARTITION",
        "classification_proof": {
            "surplus_identity": "e=sum_v binom(deg(v)-1,2)",
            "partition_of_4": "4=1+1+1+1 or 4=3+1; hence four cubic vertices or one quartic plus one cubic",
            "four_cubic_internal_tree_shapes": "the internal-vertex tree on four vertices is P4 or K1,3",
            "quartic_cubic_shape": "the two branch vertices are adjacent, with three leaves at the quartic and two at the cubic",
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
        "target_deltas": [0, 1, 2, 3],
        "target_orders": "n>=27",
        "skeletons": skeleton_rows,
        "root_location_partitions": root_rows,
        "totals": totals,
        "no_gap_reason": "Every positive edge length and every allowed root split coordinate belongs to exactly one short literal or one long base-plus-offset state; Burnside averaging uses the full stabilizer of the rooted skeleton object.",
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "This is an exact topology/root/coordinate partition only. It does not assert Delta positivity for e=4, e>=5, forests, or Problem 993.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SKELETONS", json.dumps(skeleton_rows, indent=2))
    print("TOTALS", totals)
    for row in root_rows:
        print(row["root_location_orbit"], row["coordinate_patterns"], row["mixed_long_short_patterns"], row["all_short_patterns_n27_plus"], row["all_short_maximum_order"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
