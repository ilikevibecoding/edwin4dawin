#!/usr/bin/env python3
"""Independent full replay of the e=5, n=27 quartic-pendant-internal rooted orbit."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
import time
from collections import Counter, deque
from pathlib import Path

import audit_rank8_delta03_e5_quartic_center_two_cubic_central_root_order27_agent as literal


HERE = Path(__file__).resolve().parent
PRIMARY = HERE / "rank8_delta03_e5_quartic_center_two_cubic_quartic_pendant_internal_order27_exact_agent_20260823.json"
OUTPUT = HERE / "rank8_delta03_e5_quartic_center_two_cubic_quartic_pendant_internal_order27_independent_audit_agent_20260823.json"
EXPECTED = {
    "verify_rank8_delta03_e5_quartic_center_two_cubic_quartic_pendant_internal_order27_i256_agent.rs":
        "0A8D0253E74C9A7D386B5328F96A9D13C3974DC5DFD17977CC1C4370AAA58AB2",
    "verify_rank8_delta03_e5_quartic_center_two_cubic_quartic_pendant_internal_order27_i256_agent.exe":
        "A7C8C3E3FF11EA51E9CB26D3B6BC5D0634BCB33741ED5FDA2E9FBA00A1EBD2DD",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs":
        "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "run_rank8_delta03_e5_quartic_center_two_cubic_quartic_pendant_internal_order27_i256_agent.py":
        "DF4BC935C8B466DB125F1BA648FE8C73265397801CFE49D04DF2CBF796E63483",
    "rank8_delta03_e5_quartic_center_two_cubic_quartic_pendant_internal_order27_exact_agent_20260823.json":
        "49F913A9869E0896A465695A80A523726FD4BA3B7124D18EB8B38C054C5BCD73",
    # This is the already sealed, independently transcribed Python literal-tree
    # and arbitrary-integer residual engine.  No Rust producer code is imported.
    "audit_rank8_delta03_e5_quartic_center_two_cubic_central_root_order27_agent.py":
        "A3D0F6FE5DA7A2D32E59492668D8869570B01159718D663B67ADCE1AE5BECBE1",
}
PASS_PRIMARY = "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_QUARTIC_PENDANT_INTERNAL_ORDER27"
PASS_AUDIT = "PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_QUARTIC_PENDANT_INTERNAL_ORDER27_AUDIT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def canonical(segments: tuple[int, ...]) -> bool:
    """Sort each cubic leaf pair and then the two complete cubic modules."""
    assert len(segments) == literal.EDGE_COUNT + 1
    if segments[5] > segments[6] or segments[7] > segments[8]:
        return False
    return (segments[5], segments[6], segments[2]) <= (segments[7], segments[8], segments[3])


def rooted_group() -> tuple[tuple[int, ...], ...]:
    """The order-8 cubic-module wreath group fixing the split Q pendant."""
    identity = tuple(range(literal.EDGE_COUNT + 1))

    def swap(*pairs: tuple[int, int]) -> tuple[int, ...]:
        row = list(identity)
        for left, right in pairs:
            row[left], row[right] = row[right], row[left]
        return tuple(row)

    generators = (
        swap((5, 6)),
        swap((7, 8)),
        swap((2, 3), (5, 7), (6, 8)),
    )
    group = {identity}
    queue = deque([identity])
    while queue:
        current = queue.popleft()
        for generator in generators:
            candidate = literal.compose(generator, current)
            if candidate not in group:
                group.add(candidate)
                queue.append(candidate)
    assert len(group) == 8
    return tuple(sorted(group))


def burnside_orbit_count() -> tuple[int, dict[str, dict[str, int]]]:
    fixed_sum = 0
    by_cycle_type: dict[str, dict[str, int]] = {}
    for permutation in rooted_group():
        cycles = literal.cycle_lengths(permutation)
        fixed = literal.fixed_positive_compositions(cycles, literal.TOTAL_LENGTH)
        key = ",".join(map(str, cycles))
        row = by_cycle_type.setdefault(key, {"group_elements": 0, "fixed_each": fixed})
        assert row["fixed_each"] == fixed
        row["group_elements"] += 1
        fixed_sum += fixed
    assert fixed_sum % 8 == 0
    return fixed_sum // 8, by_cycle_type


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == PASS_PRIMARY
    assert primary["rooted_automorphism_group_order"] == 8
    assert primary["nonpositive"] == [0, 0, 0, 0]

    started = time.perf_counter()
    raw_count = math.comb(literal.TOTAL_LENGTH - 1, literal.EDGE_COUNT)
    assert raw_count == 1081575
    burnside_count, burnside_cycle_types = burnside_orbit_count()
    assert burnside_count == 191267

    canonical_count = 0
    literal_tree_checks = 0
    literal_deletion_checks = 0
    nonpositive = [0, 0, 0, 0]
    minima: list[dict[str, object] | None] = [None, None, None, None]
    value_stream = hashlib.sha256()
    expected_degree_multiset = Counter({1: 6, 2: 18, 3: 2, 4: 1})

    for segments in literal.compositions(literal.TOTAL_LENGTH, literal.EDGE_COUNT + 1):
        if not canonical(segments):
            continue
        canonical_count += 1
        lengths = (
            segments[2], segments[3], segments[0] + segments[1], segments[4],
            segments[5], segments[6], segments[7], segments[8],
        )
        adjacency = literal.subdivision(lengths)
        root = literal.SKELETON_VERTICES + (segments[2] - 1) + (segments[3] - 1) + (segments[0] - 1)
        degrees = Counter(len(neighbors) for neighbors in adjacency)
        assert degrees == expected_degree_multiset
        assert literal.SKELETON_VERTICES <= root < literal.ORDER
        assert len(adjacency[root]) == 2
        assert sum(map(len, adjacency)) == 2 * (literal.ORDER - 1)
        surplus = sum(math.comb(max(degree - 1, 0), 2) for degree in degrees.elements())
        assert surplus == 5

        root_absent, root_present, seen = literal.rooted_states(adjacency, root)
        assert len(seen) == literal.ORDER
        core = literal.add(root_absent, root_present)
        deleted = literal.literal_deleted_forest_polynomial(adjacency, root)
        assert deleted == root_absent
        literal_tree_checks += 1
        literal_deletion_checks += 1

        values = literal.deltas(core, deleted)
        value_stream.update((",".join(map(str, segments)) + ":" + ",".join(map(str, values)) + "\n").encode())
        for rank, value in enumerate(values):
            if value <= 0:
                nonpositive[rank] += 1
            if minima[rank] is None or value < minima[rank]["value"]:
                minima[rank] = {
                    "value": value,
                    "root_segments": list(segments),
                    "lengths": list(lengths),
                    "root": root,
                    "core": core,
                    "deleted": deleted,
                }
        if canonical_count % 4096 == 0:
            current, _ = literal.process_memory()
            if current >= literal.HARD_RSS_LIMIT:
                raise MemoryError(
                    f"audit RSS {current} reached hard limit {literal.HARD_RSS_LIMIT}"
                )
            print("AUDIT_PROGRESS", canonical_count, flush=True)

    assert canonical_count == burnside_count == primary["canonical_subdivisions"] == 191267
    assert literal_tree_checks == primary["literal_root_checks"] == 191267
    assert literal_deletion_checks == 191267
    assert nonpositive == primary["nonpositive"] == [0, 0, 0, 0]

    minimum_replays = []
    for rank, minimum in enumerate(minima):
        assert minimum is not None
        primary_minimum = primary["minima"][str(rank)]
        assert minimum["value"] == int(primary_minimum["value"])
        assert minimum["root_segments"] == primary_minimum["root_segments"]
        assert minimum["lengths"] == primary_minimum["lengths"]
        assert minimum["root"] == primary_minimum["root"]
        assert minimum["core"] == primary_minimum["core"]
        assert minimum["deleted"] == primary_minimum["deleted"]
        minimum_replays.append({"delta": rank, **minimum})

    current_rss, peak_rss = literal.process_memory()
    assert current_rss < literal.HARD_RSS_LIMIT and peak_rss < literal.HARD_RSS_LIMIT
    payload = {
        "schema": "rank8-delta03-e5-quartic-center-two-cubic-quartic-pendant-internal-order27-independent-audit-agent-v1",
        "status": PASS_AUDIT,
        "audit_claim": (
            "The hash-pinned independent Python literal-tree engine enumerated the full rooted quotient, "
            "rebuilt every 27-vertex tree, independently deleted the quartic-side pendant internal root as a forest, "
            "recomputed Delta0..3, and matched the primary minima exactly."
        ),
        "rooted_orbit_exhaustivity": (
            "Any internal root on either quartic-to-leaf edge maps to the first pendant with its "
            "quartic-side and leaf-side distances preserved; its stabilizer is the order-8 "
            "cubic-module wreath group."
        ),
        "no_gap_enumeration": {
            "raw_positive_root_split_compositions": raw_count,
            "root_split_slots": 9,
            "rooted_automorphism_group_order": 8,
            "burnside_orbits": burnside_count,
            "direct_canonical_representatives": canonical_count,
            "burnside_cycle_types": burnside_cycle_types,
        },
        "exact_checks": {
            "literal_tree_checks": literal_tree_checks,
            "literal_deletion_forest_checks": literal_deletion_checks,
            "nonpositive": nonpositive,
            "minimum_replays": len(minimum_replays),
        },
        "minimum_replays": minimum_replays,
        "independent_value_stream_sha256": value_stream.hexdigest().upper(),
        "arithmetic": "Python arbitrary-precision integers; no modular or floating-point sign decisions",
        "resources": {
            "runtime_seconds": time.perf_counter() - started,
            "current_rss_bytes": current_rss,
            "peak_rss_bytes": peak_rss,
            "hard_rss_limit_bytes": literal.HARD_RSS_LIMIT,
        },
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Exactly e=5, n=27, quartic_center_two_cubic:quartic_pendant_internal, Delta0..3. "
            "No other root orbit, skeleton, order, forest-Q8, PGC, or Problem 993 claim."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(PASS_AUDIT)
    print("RAW", raw_count, "BURNSIDE", burnside_count, "CANONICAL", canonical_count)
    print("LITERAL", literal_tree_checks, "DELETIONS", literal_deletion_checks)
    print("PEAK", peak_rss, "RUNTIME", payload["resources"]["runtime_seconds"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()



