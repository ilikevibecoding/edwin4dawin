#!/usr/bin/env python3
"""Independent automorphism/Burnside audit of the seven-orbit skeleton assembly."""

from __future__ import annotations

import hashlib
import json
from collections import deque
from pathlib import Path


HERE = Path(__file__).resolve().parent
ASSEMBLER = HERE / "assemble_rank8_delta03_e5_quartic_center_two_cubic_order27_all_roots_agent.py"
PRIMARY = HERE / "rank8_delta03_e5_quartic_center_two_cubic_order27_all_roots_exact_agent_20260823.json"
OUTPUT = HERE / "rank8_delta03_e5_quartic_center_two_cubic_order27_all_roots_independent_audit_agent_20260823.json"
EXPECTED_ASSEMBLER_SHA256 = "607CE40D529F5BD1C73684969564B9CFAE0CED7AF5263D2C100EF9D793E19A71"
EXPECTED_PRIMARY_SHA256 = "B5D1F3C3E27B54D77A229CC2CCE3E95679523164A40A433796E6678743220A34"
TOTAL_LENGTH = 26
EDGES = (
    (0, 1), (0, 2),
    (0, 3), (0, 4),
    (1, 5), (1, 6),
    (2, 7), (2, 8),
)
EDGE_INDEX = {tuple(sorted(edge)): index for index, edge in enumerate(EDGES)}
EXPECTED = {
    "central_quartic": ("suppressed_vertex", 0, 16, 46685),
    "cubic_branch": ("suppressed_vertex", 1, 8, 92950),
    "quartic_leaf": ("suppressed_vertex", 3, 8, 80938),
    "cubic_leaf": ("suppressed_vertex", 5, 4, 161161),
    "center_cubic_spine_internal": ("suppressed_edge_interior", 0, 8, 223938),
    "quartic_pendant_internal": ("suppressed_edge_interior", 2, 8, 191267),
    "cubic_pendant_internal": ("suppressed_edge_interior", 4, 4, 379665),
}


def stable_bytes(path: Path) -> bytes:
    before = path.stat()
    data = path.read_bytes()
    after = path.stat()
    assert before.st_size == after.st_size == len(data), f"moving size: {path.name}"
    assert before.st_mtime_ns == after.st_mtime_ns, f"moving mtime: {path.name}"
    return data


def sha256(path: Path) -> str:
    return hashlib.sha256(stable_bytes(path)).hexdigest().upper()


def load(path: Path) -> dict:
    return json.loads(stable_bytes(path).decode("utf-8"))


def compose(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(left[right[index]] for index in range(len(left)))


def automorphism_group() -> tuple[tuple[int, ...], ...]:
    identity = tuple(range(9))

    def swap(*pairs: tuple[int, int]) -> tuple[int, ...]:
        row = list(identity)
        for left, right in pairs:
            row[left], row[right] = row[right], row[left]
        return tuple(row)

    generators = (
        swap((3, 4)),
        swap((5, 6)),
        swap((7, 8)),
        swap((1, 2), (5, 7), (6, 8)),
    )
    group = {identity}
    queue = deque([identity])
    while queue:
        current = queue.popleft()
        for generator in generators:
            candidate = compose(generator, current)
            if candidate not in group:
                group.add(candidate)
                queue.append(candidate)
    assert len(group) == 16
    return tuple(sorted(group))


def induced_edge_permutation(vertex_permutation: tuple[int, ...]) -> tuple[int, ...]:
    row = []
    for left, right in EDGES:
        image = tuple(sorted((vertex_permutation[left], vertex_permutation[right])))
        row.append(EDGE_INDEX[image])
    assert len(set(row)) == len(EDGES)
    return tuple(row)


def item_orbits(items: range, permutations: tuple[tuple[int, ...], ...]) -> tuple[tuple[int, ...], ...]:
    unseen = set(items)
    rows = []
    while unseen:
        representative = min(unseen)
        orbit = {permutation[representative] for permutation in permutations}
        assert orbit <= unseen
        rows.append(tuple(sorted(orbit)))
        unseen -= orbit
    return tuple(rows)


def cycles(permutation: tuple[int, ...]) -> tuple[tuple[int, ...], ...]:
    unseen = set(range(len(permutation)))
    rows = []
    while unseen:
        start = min(unseen)
        row = []
        current = start
        while current in unseen:
            unseen.remove(current)
            row.append(current)
            current = permutation[current]
        assert current == start
        rows.append(tuple(row))
    return tuple(rows)


def fixed_positive_compositions(permutation: tuple[int, ...], total: int) -> int:
    weights = [len(row) for row in cycles(permutation)]
    counts = [0] * (total + 1)
    counts[0] = 1
    for weight in weights:
        next_counts = [0] * (total + 1)
        for subtotal, count in enumerate(counts):
            if not count:
                continue
            value = 1
            while subtotal + weight * value <= total:
                next_counts[subtotal + weight * value] += count
                value += 1
        counts = next_counts
    return counts[total]


def vertex_root_burnside(
    group: tuple[tuple[int, ...], ...], representative: int
) -> tuple[int, int]:
    stabilizer = tuple(row for row in group if row[representative] == representative)
    fixed_sum = sum(
        fixed_positive_compositions(induced_edge_permutation(row), TOTAL_LENGTH)
        for row in stabilizer
    )
    assert fixed_sum % len(stabilizer) == 0
    return len(stabilizer), fixed_sum // len(stabilizer)


def edge_split_permutation(
    edge_permutation: tuple[int, ...], representative: int
) -> tuple[int, ...]:
    assert edge_permutation[representative] == representative
    remaining = [edge for edge in range(len(EDGES)) if edge != representative]
    slot = {edge: index + 2 for index, edge in enumerate(remaining)}
    row = [0, 1]
    row.extend(slot[edge_permutation[edge]] for edge in remaining)
    assert len(row) == 9 and len(set(row)) == 9
    return tuple(row)


def edge_internal_root_burnside(
    group: tuple[tuple[int, ...], ...], representative: int
) -> tuple[int, int]:
    left, right = EDGES[representative]
    rows = []
    for vertex_permutation in group:
        edge_permutation = induced_edge_permutation(vertex_permutation)
        if edge_permutation[representative] != representative:
            continue
        # The endpoints have unequal degrees in all three edge types, so a
        # stabilizer element fixes both and cannot reverse the split segments.
        assert vertex_permutation[left] == left and vertex_permutation[right] == right
        rows.append(edge_split_permutation(edge_permutation, representative))
    fixed_sum = sum(fixed_positive_compositions(row, TOTAL_LENGTH) for row in rows)
    assert fixed_sum % len(rows) == 0
    return len(rows), fixed_sum // len(rows)


def fixed_assignments_and_internal_roots(edge_permutation: tuple[int, ...]) -> tuple[int, int]:
    """Return invariant length assignments and fixed internal-root incidences."""
    cycle_rows = cycles(edge_permutation)
    counts = [0] * (TOTAL_LENGTH + 1)
    internal_weights = [0] * (TOTAL_LENGTH + 1)
    counts[0] = 1
    for cycle in cycle_rows:
        weight = len(cycle)
        next_counts = [0] * (TOTAL_LENGTH + 1)
        next_weights = [0] * (TOTAL_LENGTH + 1)
        for subtotal in range(TOTAL_LENGTH + 1):
            count = counts[subtotal]
            if not count:
                continue
            value = 1
            while subtotal + weight * value <= TOTAL_LENGTH:
                target = subtotal + weight * value
                next_counts[target] += count
                next_weights[target] += internal_weights[subtotal]
                if weight == 1:
                    next_weights[target] += count * (value - 1)
                value += 1
        counts = next_counts
        internal_weights = next_weights
    return counts[TOTAL_LENGTH], internal_weights[TOTAL_LENGTH]


def global_rooted_burnside(group: tuple[tuple[int, ...], ...]) -> int:
    fixed_sum = 0
    for vertex_permutation in group:
        edge_permutation = induced_edge_permutation(vertex_permutation)
        assignments, fixed_internal_roots = fixed_assignments_and_internal_roots(edge_permutation)
        fixed_skeleton_vertices = sum(
            vertex_permutation[vertex] == vertex for vertex in range(9)
        )
        fixed_sum += fixed_skeleton_vertices * assignments + fixed_internal_roots
    assert fixed_sum % len(group) == 0
    return fixed_sum // len(group)


def main() -> int:
    assert sha256(ASSEMBLER) == EXPECTED_ASSEMBLER_SHA256
    assert sha256(PRIMARY) == EXPECTED_PRIMARY_SHA256
    primary = load(PRIMARY)
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_ALL_ROOTS_ORDER27"

    group = automorphism_group()
    edge_group = tuple(induced_edge_permutation(row) for row in group)
    vertex_orbits = item_orbits(range(9), group)
    edge_orbits = item_orbits(range(8), edge_group)
    assert vertex_orbits == ((0,), (1, 2), (3, 4), (5, 6, 7, 8))
    assert edge_orbits == ((0, 1), (2, 3), (4, 5, 6, 7))

    derived = {}
    for name, (kind, representative, expected_stabilizer, expected_count) in EXPECTED.items():
        if kind == "suppressed_vertex":
            stabilizer, count = vertex_root_burnside(group, representative)
        else:
            stabilizer, count = edge_internal_root_burnside(group, representative)
        assert stabilizer == expected_stabilizer
        assert count == expected_count
        derived[name] = {
            "root_location_kind": kind,
            "representative_index": representative,
            "stabilizer_order": stabilizer,
            "independent_burnside_orbits": count,
        }

    global_count = global_rooted_burnside(group)
    assert global_count == sum(row[3] for row in EXPECTED.values()) == 1176604

    evidence = {row["root_orbit"]: row for row in primary["orbit_evidence"]}
    assert set(evidence) == set(EXPECTED)
    rehashed = {}
    for name, row in evidence.items():
        expected = EXPECTED[name]
        assert row["root_location_kind"] == expected[0]
        assert row["representative_index"] == expected[1]
        assert row["rooted_stabilizer_order"] == expected[2]
        assert row["canonical_rooted_configurations"] == expected[3]
        assert row["nonpositive_Delta0_3"] == [0, 0, 0, 0]
        assert sha256(HERE / row["producer"]) == row["producer_sha256"]
        assert sha256(HERE / row["independent_audit"]) == row["independent_audit_sha256"]
        audit = load(HERE / row["independent_audit"])
        assert audit["exact_checks"]["nonpositive"] == [0, 0, 0, 0]
        assert audit["no_gap_enumeration"]["burnside_orbits"] == expected[3]
        rehashed[row["producer"]] = row["producer_sha256"]
        rehashed[row["independent_audit"]] = row["independent_audit_sha256"]

    partition = primary["root_location_partition"]
    assert partition["root_orbits_total"] == 7
    assert partition["gaps"] == partition["overlaps"] == 0
    assert sum(partition["suppressed_vertex_orbit_sizes"]) == 9
    assert sum(partition["suppressed_edge_orbit_sizes"]) == 8
    assert primary["totals"]["canonical_rooted_isomorphism_classes"] == global_count
    assert primary["totals"]["nonpositive_Delta0_3"] == [0, 0, 0, 0]
    assert primary["totals"]["minimum_replays"] == 28
    assert primary["proof_booleans"] == {
        "all_seven_root_location_orbits_partitioned": True,
        "this_skeleton_all_roots_order27_Delta0_3_complete": True,
        "all_e5_skeletons_order27_complete": False,
        "connected_Q8_complete": False,
        "forest_Q8_complete": False,
        "rank8_PGC_complete": False,
        "problem_993_solved": False,
    }

    payload = {
        "schema": "rank8-delta03-e5-quartic-center-two-cubic-order27-all-roots-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_ALL_ROOTS_ORDER27_PARTITION_AUDIT",
        "independent_skeleton_automorphism_group_order": len(group),
        "derived_suppressed_vertex_orbits": [list(row) for row in vertex_orbits],
        "derived_suppressed_edge_orbits": [list(row) for row in edge_orbits],
        "derived_root_orbit_burnside_counts": derived,
        "independent_global_rooted_burnside_count": global_count,
        "sum_of_seven_disjoint_root_orbit_counts": sum(row[3] for row in EXPECTED.values()),
        "evidence_files_rehashed": len(rehashed),
        "evidence_hashes": rehashed,
        "no_double_counting_checks": {
            "suppressed_vertex_orbits_partition_all_9_vertices": True,
            "suppressed_edge_orbits_partition_all_8_edges": True,
            "vertex_and_edge_interior_root_locations_disjoint": True,
            "global_Burnside_equals_sum_of_orbit_Burnside_counts": True,
        },
        "proof_booleans_replayed": primary["proof_booleans"],
        "assembler_sha256": EXPECTED_ASSEMBLER_SHA256,
        "primary_sha256": EXPECTED_PRIMARY_SHA256,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "PASS closes all roots only for quartic_center_two_cubic at e=5 and n=27. "
            "It does not close other e=5 skeletons, larger orders, connected Q8, forest Q8, "
            "rank-eight PGC, or Problem 993."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("AUT", len(group), "VERTEX_ORBITS", vertex_orbits, "EDGE_ORBITS", edge_orbits)
    print("GLOBAL_ROOTED", global_count, "EVIDENCE", len(rehashed))
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
