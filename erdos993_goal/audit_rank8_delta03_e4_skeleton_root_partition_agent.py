#!/usr/bin/env python3
"""Independent permutation/Burnside audit of the e=4 root partition."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from collections import Counter
from pathlib import Path


HERE = Path(__file__).resolve().parent
PRIMARY_SOURCE = HERE / "assemble_rank8_delta03_e4_skeleton_root_partition_agent.py"
PRIMARY_REPORT = HERE / "rank8_delta03_e4_skeleton_root_partition_exact_agent_20260823.json"
OUTPUT = HERE / "rank8_delta03_e4_skeleton_root_partition_independent_audit_agent_20260823.json"
EXPECTED = {
    "assemble_rank8_delta03_e4_skeleton_root_partition_agent.py": "D52498A73F0E3208A5ABE523CC131FE76EDC655735332598DDA4D2B71698EBC1",
    "rank8_delta03_e4_skeleton_root_partition_exact_agent_20260823.json": "E68D35E2CA3D5E061AACB7D45CD5B5D5A5ABA61FB0F8621111367E0CC1BA8F28",
}

SPECS = {
    "pendant": (tuple(range(1, 7)), 7),
    "spine": (tuple(range(1, 8)), 8),
    "incident_pendant": (tuple(range(1, 8)), 8),
    "pendant_near_gap": (tuple(range(0, 7)), 7),
    "pendant_tail_component": (tuple(range(1, 7)), 7),
    "spine_root_gap": (tuple(range(0, 7)), 7),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def E(a, b):
    return tuple(sorted((a, b)))


def graphs():
    star = {E("z", f"b{i}") for i in range(3)}
    star |= {E(f"b{i}", f"x{i}{j}") for i in range(3) for j in range(2)}
    path = {E(f"b{i}", f"b{i+1}") for i in range(3)}
    path |= {E("b0", "x00"), E("b0", "x01"), E("b1", "x1"), E("b2", "x2"), E("b3", "x30"), E("b3", "x31")}
    bistar = {E("q", "c")}
    bistar |= {E("q", f"u{i}") for i in range(3)}
    bistar |= {E("c", f"v{i}") for i in range(2)}
    return {"four_cubic_star": star, "four_cubic_path": path, "quartic_cubic_bistar": bistar}


ROOTS = {
    "four_cubic_star": (
        ("center_branch", "vertex", "z"), ("outer_branch", "vertex", "b0"), ("leaf", "vertex", "x00"),
        ("center_outer_spine_internal", "edge", E("z", "b0")), ("pendant_internal", "edge", E("b0", "x00")),
    ),
    "four_cubic_path": (
        ("outer_branch", "vertex", "b0"), ("inner_branch", "vertex", "b1"),
        ("outer_leaf", "vertex", "x00"), ("inner_leaf", "vertex", "x1"),
        ("outer_spine_internal", "edge", E("b0", "b1")), ("middle_spine_internal", "edge", E("b1", "b2")),
        ("outer_pendant_internal", "edge", E("b0", "x00")), ("inner_pendant_internal", "edge", E("b1", "x1")),
    ),
    "quartic_cubic_bistar": (
        ("quartic_branch", "vertex", "q"), ("cubic_branch", "vertex", "c"),
        ("quartic_leaf", "vertex", "u0"), ("cubic_leaf", "vertex", "v0"),
        ("central_spine_internal", "edge", E("q", "c")),
        ("quartic_pendant_internal", "edge", E("q", "u0")), ("cubic_pendant_internal", "edge", E("c", "v0")),
    ),
}


def vertices(edges):
    return sorted({node for item in edges for node in item})


def degrees(edges):
    out = Counter()
    for a, b in edges:
        out[a] += 1
        out[b] += 1
    return out


def automorphisms(edges):
    nodes = vertices(edges)
    degree = degrees(edges)
    classes = {}
    for node in nodes:
        classes.setdefault(degree[node], []).append(node)
    class_rows = [tuple(sorted(row)) for _, row in sorted(classes.items())]
    out = []
    for perm_rows in itertools.product(*(itertools.permutations(row) for row in class_rows)):
        mapping = {}
        for original, image in zip(class_rows, perm_rows):
            mapping.update(zip(original, image))
        if {E(mapping[a], mapping[b]) for a, b in edges} == edges:
            out.append(mapping)
    return out


def edge_kind(item, degree):
    return "pendant" if min(degree[item[0]], degree[item[1]]) == 1 else "spine"


def coordinates(edges, degree, root_kind, root):
    types = {}
    if root_kind == "vertex":
        for item in edges:
            kind = edge_kind(item, degree)
            if degree[root] == 1 and root in item:
                kind = "incident_pendant"
            types[("e", item)] = kind
        return tuple(sorted(types, key=str)), types, 1
    for item in edges:
        if item != root:
            types[("e", item)] = edge_kind(item, degree)
    if edge_kind(root, degree) == "pendant":
        branch = next(node for node in root if degree[node] > 1)
        leaf = next(node for node in root if degree[node] == 1)
        types[("s", branch)] = "pendant_near_gap"
        types[("s", leaf)] = "pendant_tail_component"
        constant = 2
    else:
        types[("s", root[0])] = "spine_root_gap"
        types[("s", root[1])] = "spine_root_gap"
        constant = 3
    return tuple(sorted(types, key=str)), types, constant


def image_slot(slot, mapping):
    return ("e", E(mapping[slot[1][0]], mapping[slot[1][1]])) if slot[0] == "e" else ("s", mapping[slot[1]])


def distribution(edges, degree, root_kind, root, group):
    stabilizer = [mapping for mapping in group if (mapping[root] == root if root_kind == "vertex" else E(mapping[root[0]], mapping[root[1]]) == root)]
    slots, types, constant = coordinates(edges, degree, root_kind, root)
    index = {slot: i for i, slot in enumerate(slots)}
    accumulated = Counter()
    cycle_index = Counter()
    for mapping in stabilizer:
        permutation = [index[image_slot(slot, mapping)] for slot in slots]
        unseen = set(range(len(slots)))
        cycles = []
        while unseen:
            start = min(unseen)
            cycle = []
            current = start
            while current in unseen:
                unseen.remove(current)
                cycle.append(current)
                current = permutation[current]
            cycles.append(cycle)
        signature = tuple(sorted((types[slots[cycle[0]]], len(cycle)) for cycle in cycles))
        cycle_index[signature] += 1
        fixed = Counter({(constant, 0): 1})
        for cycle in cycles:
            kind = types[slots[cycle[0]]]
            short, base = SPECS[kind]
            length = len(cycle)
            choices = [(length * value, 0) for value in short] + [(length * base, length)]
            next_fixed = Counter()
            for (order, longs), count in fixed.items():
                for add_order, add_longs in choices:
                    next_fixed[(order + add_order, longs + add_longs)] += count
            fixed = next_fixed
        accumulated.update(fixed)
    assert all(count % len(stabilizer) == 0 for count in accumulated.values())
    return Counter({key: count // len(stabilizer) for key, count in accumulated.items()}), cycle_index, len(stabilizer), Counter(types.values())


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY_REPORT.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA03_E4_SKELETON_ROOT_NO_GAP_PARTITION"
    primary_rows = {row["root_location_orbit"]: row for row in primary["root_location_partitions"]}

    rows = {}
    group_orders = {}
    for skeleton, edges in graphs().items():
        degree = degrees(edges)
        surplus = sum(math.comb(value - 1, 2) for value in degree.values())
        assert surplus == 4 and len(edges) == len(degree) - 1
        group = automorphisms(edges)
        group_orders[skeleton] = len(group)
        for label, kind, root in ROOTS[skeleton]:
            dist, cycle_index, stabilizer, type_counts = distribution(edges, degree, kind, root, group)
            coordinate_count = len(edges) + (1 if kind == "edge" else 0)
            total = sum(dist.values())
            short = sum(count for (order, longs), count in dist.items() if longs == 0)
            long = sum(count for (order, longs), count in dist.items() if longs == coordinate_count)
            mixed = total - short - long
            short_n27 = sum(count for (order, longs), count in dist.items() if longs == 0 and order >= 27)
            maximum = max(order for (order, longs) in dist if longs == 0)
            key = f"{skeleton}:{label}"
            rows[key] = {
                "stabilizer_order": stabilizer,
                "coordinate_count": coordinate_count,
                "coordinate_type_counts": dict(type_counts),
                "coordinate_patterns": total,
                "all_short_literal_patterns": short,
                "mixed_long_short_patterns": mixed,
                "all_long_patterns": long,
                "all_short_patterns_n27_plus": short_n27,
                "all_short_maximum_order": maximum,
                "cycle_index": [
                    {"cycles": [[name, length] for name, length in signature], "automorphisms": count}
                    for signature, count in sorted(cycle_index.items(), key=str)
                ],
            }
            expected = primary_rows[key]
            for field, value in rows[key].items():
                assert expected[field] == value, (key, field, expected[field], value)

    assert group_orders == {"four_cubic_star": 48, "four_cubic_path": 8, "quartic_cubic_bistar": 12}
    totals = {
        "root_location_orbits": len(rows),
        "coordinate_patterns": sum(row["coordinate_patterns"] for row in rows.values()),
        "all_short_literal_patterns": sum(row["all_short_literal_patterns"] for row in rows.values()),
        "mixed_long_short_patterns": sum(row["mixed_long_short_patterns"] for row in rows.values()),
        "all_long_patterns": sum(row["all_long_patterns"] for row in rows.values()),
        "all_short_patterns_n27_plus": sum(row["all_short_patterns_n27_plus"] for row in rows.values()),
    }
    for field, value in totals.items():
        assert primary["totals"][field] == value

    payload = {
        "schema": "rank8-delta03-e4-skeleton-root-partition-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA03_E4_SKELETON_ROOT_NO_GAP_PARTITION_AUDIT",
        "method": "enumerate every degree-preserving vertex permutation, retain adjacency automorphisms, and independently apply rooted Burnside cycle counts",
        "automorphism_group_orders": group_orders,
        "root_location_orbits": len(rows),
        "totals": totals,
        "primary_source_sha256": sha256(PRIMARY_SOURCE),
        "primary_report_sha256": sha256(PRIMARY_REPORT),
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Independent classification/partition audit only; no e=4 Delta sign is inferred.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("GROUPS", group_orders, "TOTALS", totals)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
