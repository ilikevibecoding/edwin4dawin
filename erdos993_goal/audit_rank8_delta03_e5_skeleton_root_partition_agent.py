#!/usr/bin/env python3
"""Independent audit of the exact e=5 skeleton/root partition."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json"
OUTPUT = ROOT / "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json"
EXPECTED = {
    "assemble_rank8_delta03_e5_skeleton_root_partition_agent.py":
        "762B94E4FFF422A286FBD6E0B80294996EFC46094292FFF1CDC53A7B4C1E7073",
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json":
        "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
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
    "pendant": (tuple(range(1, 7)), 7),
    "spine": (tuple(range(1, 8)), 8),
    "incident_pendant": (tuple(range(1, 8)), 8),
    "pendant_near_gap": (tuple(range(0, 7)), 7),
    "pendant_tail_component": (tuple(range(1, 7)), 7),
    "spine_root_gap": (tuple(range(0, 7)), 7),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def normalized_edge(left: str, right: str) -> tuple[str, str]:
    return tuple(sorted((left, right)))


def graph_from_edges(edges: list[tuple[str, str]]) -> dict[str, set[str]]:
    graph: dict[str, set[str]] = {}
    for left, right in edges:
        assert left != right
        graph.setdefault(left, set()).add(right)
        graph.setdefault(right, set()).add(left)
    assert sum(map(len, graph.values())) == 2 * (len(graph) - 1)
    # Independent connectivity walk.
    seen = set()
    stack = [next(iter(graph))]
    while stack:
        node = stack.pop()
        if node in seen:
            continue
        seen.add(node)
        stack.extend(graph[node] - seen)
    assert seen == set(graph)
    return graph


def audit_graphs() -> dict[str, dict[str, set[str]]]:
    path_edges = [(f"B{i}", f"B{i + 1}") for i in range(4)]
    path_edges += [("B0", "L0a"), ("B0", "L0b"), ("B1", "L1"),
                   ("B2", "L2"), ("B3", "L3"), ("B4", "L4a"), ("B4", "L4b")]
    t_edges = [("C", "A"), ("C", "B"), ("C", "M"), ("M", "D"), ("M", "LM")]
    t_edges += [(branch, f"{prefix}{suffix}")
                for branch, prefix in (("A", "LA"), ("B", "LB"), ("D", "LD"))
                for suffix in ("a", "b")]
    center_edges = [("Q", "C0"), ("Q", "C1"), ("Q", "QL0"), ("Q", "QL1"),
                    ("C0", "C0L0"), ("C0", "C0L1"),
                    ("C1", "C1L0"), ("C1", "C1L1")]
    endpoint_edges = [("Q", "C0"), ("C0", "C1"),
                      ("Q", "QL0"), ("Q", "QL1"), ("Q", "QL2"),
                      ("C0", "C0L"), ("C1", "C1L0"), ("C1", "C1L1")]
    return {
        "five_cubic_path": graph_from_edges(path_edges),
        "five_cubic_t": graph_from_edges(t_edges),
        "quartic_center_two_cubic": graph_from_edges(center_edges),
        "quartic_endpoint_cubic_path": graph_from_edges(endpoint_edges),
    }


def refined_classes(graph: dict[str, set[str]]) -> list[tuple[str, ...]]:
    colors = {node: len(neighbors) for node, neighbors in graph.items()}
    while True:
        signatures = {
            node: (colors[node], tuple(sorted(colors[neighbor] for neighbor in graph[node])))
            for node in graph
        }
        palette = {signature: index for index, signature in enumerate(sorted(set(signatures.values()), key=str))}
        updated = {node: palette[signature] for node, signature in signatures.items()}
        if updated == colors:
            break
        colors = updated
    classes: dict[int, list[str]] = {}
    for node, color in colors.items():
        classes.setdefault(color, []).append(node)
    return [tuple(sorted(nodes)) for _, nodes in sorted(classes.items())]


def exhaustive_automorphisms(graph: dict[str, set[str]]) -> list[dict[str, str]]:
    nodes = set(graph)
    edge_set = {
        normalized_edge(left, right)
        for left, neighbors in graph.items()
        for right in neighbors if left < right
    }
    classes = refined_classes(graph)
    group = []
    for class_images in itertools.product(
        *(itertools.permutations(nodes_in_class) for nodes_in_class in classes)
    ):
        mapping = {
            source: target
            for nodes_in_class, images in zip(classes, class_images)
            for source, target in zip(nodes_in_class, images)
        }
        assert set(mapping) == nodes and set(mapping.values()) == nodes
        image_edges = {
            normalized_edge(mapping[left], mapping[right]) for left, right in edge_set
        }
        if image_edges == edge_set:
            group.append(mapping)
    assert group
    return group


def orbit_partition(objects, group, image) -> list[set]:
    objects = set(objects)
    remaining = set(objects)
    parts = []
    while remaining:
        representative = min(remaining, key=str)
        orbit = {image(representative, mapping) for mapping in group}
        assert representative in orbit and orbit <= objects
        parts.append(orbit)
        remaining -= orbit
    assert set().union(*parts) == objects
    assert sum(map(len, parts)) == len(objects)
    return parts


def prufer_edges(sequence: tuple[int, ...], vertex_count: int) -> set[tuple[int, int]]:
    degree = [1] * vertex_count
    for vertex in sequence:
        degree[vertex] += 1
    edges = set()
    for vertex in sequence:
        leaf = next(index for index in range(vertex_count) if degree[index] == 1)
        edges.add(tuple(sorted((leaf, vertex))))
        degree[leaf] -= 1
        degree[vertex] -= 1
    last = [index for index in range(vertex_count) if degree[index] == 1]
    assert len(last) == 2
    edges.add(tuple(sorted(last)))
    return edges


def canonical_edge_code(edges: set[tuple[int, int]], vertex_count: int) -> tuple:
    return min(
        tuple(sorted(tuple(sorted((permutation[left], permutation[right]))) for left, right in edges))
        for permutation in itertools.permutations(range(vertex_count))
    )


def classify_internal_branch_trees() -> dict:
    five_codes = set()
    five_degrees = set()
    for sequence in itertools.product(range(5), repeat=3):
        edges = prufer_edges(sequence, 5)
        degrees = Counter(vertex for item in edges for vertex in item)
        if max(degrees.values()) <= 3:
            five_codes.add(canonical_edge_code(edges, 5))
            five_degrees.add(tuple(sorted(degrees.values(), reverse=True)))
    assert len(five_codes) == 2
    assert five_degrees == {(2, 2, 2, 1, 1), (3, 2, 1, 1, 1)}

    p3 = prufer_edges((1,), 3)
    p3_group = []
    for permutation in itertools.permutations(range(3)):
        if {
            tuple(sorted((permutation[left], permutation[right]))) for left, right in p3
        } == p3:
            p3_group.append(permutation)
    vertex_orbits = orbit_partition(
        range(3), p3_group, lambda vertex, permutation: permutation[vertex]
    )
    assert sorted(map(len, vertex_orbits)) == [1, 2]
    return {
        "five_cubic_unlabeled_internal_tree_codes": len(five_codes),
        "five_cubic_internal_degree_sequences": [list(row) for row in sorted(five_degrees)],
        "quartic_placement_orbits_on_p3": len(vertex_orbits),
        "quartic_placement_orbit_sizes": sorted(map(len, vertex_orbits)),
    }


def root_image(kind: str, root, mapping: dict[str, str]):
    if kind == "vertex":
        return mapping[root]
    return normalized_edge(mapping[root[0]], mapping[root[1]])


def edge_kind(graph, item) -> str:
    return "pendant" if min(len(graph[item[0]]), len(graph[item[1]])) == 1 else "spine"


def coordinate_slots(graph, kind: str, root):
    edges = tuple(sorted(
        (normalized_edge(left, right) for left in graph for right in graph[left] if left < right),
        key=str,
    ))
    types = {}
    if kind == "vertex":
        for item in edges:
            slot_kind = edge_kind(graph, item)
            if len(graph[root]) == 1 and root in item:
                slot_kind = "incident_pendant"
            types[("edge", item)] = slot_kind
        return tuple(types), types, 1
    for item in edges:
        if item != root:
            types[("edge", item)] = edge_kind(graph, item)
    if edge_kind(graph, root) == "pendant":
        leaf = next(node for node in root if len(graph[node]) == 1)
        branch = next(node for node in root if len(graph[node]) > 1)
        types[("split", branch)] = "pendant_near_gap"
        types[("split", leaf)] = "pendant_tail_component"
        constant = 2
    else:
        types[("split", root[0])] = "spine_root_gap"
        types[("split", root[1])] = "spine_root_gap"
        constant = 3
    return tuple(sorted(types, key=str)), types, constant


def slot_image(slot, mapping):
    if slot[0] == "edge":
        return ("edge", normalized_edge(mapping[slot[1][0]], mapping[slot[1][1]]))
    return ("split", mapping[slot[1]])


def fixed_distribution(slots, types, mapping, constant) -> Counter:
    position = {slot: index for index, slot in enumerate(slots)}
    permutation = [position[slot_image(slot, mapping)] for slot in slots]
    seen = set()
    cycles = []
    for start in range(len(slots)):
        if start in seen:
            continue
        cycle = []
        current = start
        while current not in seen:
            seen.add(current)
            cycle.append(current)
            current = permutation[current]
        cycles.append(cycle)
    distribution = Counter({(constant, 0): 1})
    for cycle in cycles:
        kind = types[slots[cycle[0]]]
        assert all(types[slots[index]] == kind for index in cycle)
        short, long_base = STATE_SPECS[kind]
        choices = [(len(cycle) * value, 0) for value in short]
        choices.append((len(cycle) * long_base, len(cycle)))
        updated = Counter()
        for (order, longs), count in distribution.items():
            for add_order, add_longs in choices:
                updated[(order + add_order, longs + add_longs)] += count
        distribution = updated
    return distribution


def independent_row(graph, group, report_row) -> dict:
    kind = report_row["root_kind"]
    representative = report_row["representative"]
    if kind == "edge":
        representative = tuple(representative)
    stabilizer = [mapping for mapping in group if root_image(kind, representative, mapping) == representative]
    slots, types, constant = coordinate_slots(graph, kind, representative)
    accumulated = Counter()
    for mapping in stabilizer:
        accumulated.update(fixed_distribution(slots, types, mapping, constant))
    assert all(count % len(stabilizer) == 0 for count in accumulated.values())
    distribution = Counter({key: count // len(stabilizer) for key, count in accumulated.items()})
    coordinates = len(slots)
    short_orders = Counter()
    mixed = 0
    all_long = 0
    for (order, longs), count in distribution.items():
        if longs == 0:
            short_orders[order] += count
        elif longs == coordinates:
            all_long += count
        else:
            mixed += count
    return {
        "stabilizer_order": len(stabilizer),
        "coordinate_count": coordinates,
        "coordinate_type_counts": dict(Counter(types.values())),
        "coordinate_patterns": sum(distribution.values()),
        "all_short_literal_patterns": sum(short_orders.values()),
        "mixed_long_short_patterns": mixed,
        "all_long_patterns": all_long,
        "all_short_order_distribution": {str(key): value for key, value in sorted(short_orders.items())},
        "all_short_patterns_order27": short_orders[27],
        "all_short_patterns_n28_plus": sum(value for key, value in short_orders.items() if key >= 28),
        "all_short_maximum_order": max(short_orders),
    }


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA03_E5_SKELETON_ROOT_NO_GAP_PARTITION"
    classification = classify_internal_branch_trees()
    graphs = audit_graphs()
    skeleton_checks = []
    independent_root_rows = []
    derived_root_names = []

    primary_skeletons = {row["skeleton"]: row for row in primary["skeletons"]}
    primary_roots = {}
    for row in primary["root_location_partitions"]:
        primary_roots.setdefault(row["skeleton"], []).append(row)

    for name, graph in graphs.items():
        group = exhaustive_automorphisms(graph)
        vertices = set(graph)
        edges = {
            normalized_edge(left, right)
            for left in graph for right in graph[left] if left < right
        }
        vertex_orbits = orbit_partition(vertices, group, lambda item, mapping: mapping[item])
        edge_orbits = orbit_partition(
            edges,
            group,
            lambda item, mapping: normalized_edge(mapping[item[0]], mapping[item[1]]),
        )
        report_skeleton = primary_skeletons[name]
        assert report_skeleton["vertices"] == len(vertices)
        assert report_skeleton["edges"] == len(edges)
        assert report_skeleton["degree_sequence"] == sorted(
            (len(graph[node]) for node in graph), reverse=True
        )
        assert report_skeleton["automorphism_group_order"] == len(group)
        assert report_skeleton["vertex_root_orbits"] == len(vertex_orbits)
        assert report_skeleton["edge_interior_root_orbits"] == len(edge_orbits)
        assert report_skeleton["total_root_location_orbits"] == len(vertex_orbits) + len(edge_orbits)

        used_vertex = []
        used_edge = []
        for row in primary_roots[name]:
            representative = row["representative"]
            if row["root_kind"] == "edge":
                representative = tuple(representative)
                candidates = edge_orbits
                used = used_edge
            else:
                candidates = vertex_orbits
                used = used_vertex
            matches = [part for part in candidates if representative in part]
            assert len(matches) == 1 and matches[0] not in used
            used.append(matches[0])
            replay = independent_row(graph, group, row)
            for field, value in replay.items():
                assert row[field] == value, f"{row['root_location_orbit']} {field}"
            independent_root_rows.append({
                "root_location_orbit": row["root_location_orbit"],
                **replay,
            })
            derived_root_names.append(row["root_location_orbit"])
        assert len(used_vertex) == len(vertex_orbits)
        assert len(used_edge) == len(edge_orbits)
        skeleton_checks.append({
            "skeleton": name,
            "automorphism_group_order": len(group),
            "vertex_orbit_sizes": sorted(map(len, vertex_orbits)),
            "edge_orbit_sizes": sorted(map(len, edge_orbits)),
            "vertex_root_orbits": len(vertex_orbits),
            "edge_interior_root_orbits": len(edge_orbits),
            "no_vertex_gaps_or_overlaps": sum(map(len, vertex_orbits)) == len(vertices),
            "no_edge_gaps_or_overlaps": sum(map(len, edge_orbits)) == len(edges),
        })

    assert len(derived_root_names) == len(set(derived_root_names)) == 42
    totals = {
        "suppressed_skeletons": len(skeleton_checks),
        "root_location_orbits": len(independent_root_rows),
        "vertex_root_orbits": sum(row["vertex_root_orbits"] for row in skeleton_checks),
        "edge_interior_root_orbits": sum(row["edge_interior_root_orbits"] for row in skeleton_checks),
        "coordinate_patterns": sum(row["coordinate_patterns"] for row in independent_root_rows),
        "all_short_literal_patterns": sum(row["all_short_literal_patterns"] for row in independent_root_rows),
        "mixed_long_short_patterns": sum(row["mixed_long_short_patterns"] for row in independent_root_rows),
        "all_long_patterns": sum(row["all_long_patterns"] for row in independent_root_rows),
        "all_short_patterns_order27": sum(row["all_short_patterns_order27"] for row in independent_root_rows),
        "all_short_patterns_n28_plus": sum(row["all_short_patterns_n28_plus"] for row in independent_root_rows),
    }
    for field, value in totals.items():
        assert primary["totals"][field] == value

    sealed = set(primary["nested_order27_evidence"]["sealed_root_orbits"])
    center = {
        row["root_location_orbit"] for row in primary_roots["quartic_center_two_cubic"]
    }
    assert sealed == center | {"quartic_endpoint_cubic_path:quartic_branch"}
    assert len(sealed) == 8
    open_n27 = set(primary["remaining_obligations"]["n27_root_orbits_without_sealed_evidence"])
    all_roots = set(derived_root_names)
    assert open_n27 == all_roots - sealed and len(open_n27) == 34
    assert set(primary["remaining_obligations"]["n28_plus_all_order_root_orbits"]) == all_roots
    assert len(all_roots) == 42

    payload = {
        "schema": "rank8-delta03-e5-skeleton-root-partition-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA03_E5_SKELETON_ROOT_NO_GAP_PARTITION_AUDIT",
        "classification_replay": classification,
        "method": (
            "Labeled Prüfer enumeration modulo all vertex permutations independently derived the branch-tree shapes; a custom color-refined exhaustive permutation engine derived every skeleton automorphism; rooted vertex/edge orbits and Burnside coordinate distributions were then recomputed without NetworkX isomorphism calls."
        ),
        "skeleton_checks": skeleton_checks,
        "root_rows_replayed": len(independent_root_rows),
        "totals_replayed": totals,
        "ledger_replay": {
            "n27_sealed_root_orbits": sorted(sealed),
            "n27_open_root_orbits": sorted(open_n27),
            "n28_plus_open_all_order_root_orbits": sorted(all_roots),
            "counts": {"n27_sealed": 8, "n27_open": 34, "n28_plus_open": 42},
        },
        "no_gap_no_overlap_checks": {
            "degree_surplus_multisets_exhausted": True,
            "internal_branch_shapes_exhausted": True,
            "all_suppressed_vertices_partitioned": True,
            "all_suppressed_edges_partitioned": True,
            "vertex_and_open_edge_interior_root_locations_disjoint": True,
            "all_42_coordinate_Burnside_distributions_match": True,
            "global_totals_match": True,
        },
        "immutable_input_hashes": actual,
        "primary_source_sha256": primary["source_sha256"],
        "primary_report_sha256": sha256(PRIMARY),
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Independent structural/evidence-ledger audit only. No new sign claim or closure for e=5, connected Q8, forest Q8, PGC, or Problem 993."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SKELETONS", [(row["skeleton"], row["vertex_root_orbits"] + row["edge_interior_root_orbits"]) for row in skeleton_checks])
    print("TOTALS", totals)
    print("LEDGER", payload["ledger_replay"]["counts"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
