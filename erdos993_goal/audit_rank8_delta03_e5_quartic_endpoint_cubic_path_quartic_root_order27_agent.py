#!/usr/bin/env python3
"""Independent full replay of one exact e=5, order-27 endpoint-quartic rooted case."""

from __future__ import annotations

import ctypes
import hashlib
import itertools
import json
import math
import time
from collections import Counter, deque
from pathlib import Path


HERE = Path(__file__).resolve().parent
PRIMARY = HERE / "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_root_order27_exact_agent_20260823.json"
OUTPUT = HERE / "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_root_order27_independent_audit_agent_20260823.json"
EXPECTED = {
    "verify_rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_root_order27_i256_agent.rs":
        "32B91523D52E4B162D3B3D2E7B4280C95834463FA6AFAAAA6F84043FF9BD8DB1",
    "verify_rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_root_order27_i256_agent.exe":
        "6A87A1EF02502E486861CF4CFA346BDEF3A4F97C97A7D66AFA11FA3DBAE5B4C8",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs":
        "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "run_rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_root_order27_i256_agent.py":
        "AB3DBFAFA71A4BB336B004931B160B9D3E618C65E2411D69CBE4A1681CB7A718",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_root_order27_exact_agent_20260823.json":
        "9BC294C2738ACA7440BB1155D6C0684C7FE0AAD5BDADC835845799D85474D98E",
}
ORDER = 27
MAX_RANK = 8
TOTAL_LENGTH = ORDER - 1
EDGE_COUNT = 8
HARD_RSS_LIMIT = 500 * 1024 * 1024
PASS_PRIMARY = "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_QUARTIC_ROOT_ORDER27"
PASS_AUDIT = "PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_QUARTIC_ROOT_ORDER27_AUDIT"

# This transcription deliberately does not import the Rust producer.  Vertex
# 0 is the endpoint quartic root, 1 is the middle cubic, and 2 is the endpoint
# cubic.
SKELETON_EDGES = (
    (0, 1), (1, 2),
    (0, 3), (0, 4), (0, 5),
    (1, 6),
    (2, 7), (2, 8),
)
SKELETON_VERTICES = 9


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


class ProcessMemoryCounters(ctypes.Structure):
    _fields_ = [
        ("cb", ctypes.c_ulong),
        ("page_fault_count", ctypes.c_ulong),
        ("peak_working_set_size", ctypes.c_size_t),
        ("working_set_size", ctypes.c_size_t),
        ("quota_peak_paged_pool_usage", ctypes.c_size_t),
        ("quota_paged_pool_usage", ctypes.c_size_t),
        ("quota_peak_nonpaged_pool_usage", ctypes.c_size_t),
        ("quota_nonpaged_pool_usage", ctypes.c_size_t),
        ("pagefile_usage", ctypes.c_size_t),
        ("peak_pagefile_usage", ctypes.c_size_t),
    ]


def process_memory() -> tuple[int, int]:
    kernel32 = ctypes.windll.kernel32
    psapi = ctypes.windll.psapi
    kernel32.GetCurrentProcess.restype = ctypes.c_void_p
    psapi.GetProcessMemoryInfo.argtypes = [
        ctypes.c_void_p,
        ctypes.POINTER(ProcessMemoryCounters),
        ctypes.c_ulong,
    ]
    psapi.GetProcessMemoryInfo.restype = ctypes.c_int
    handle = kernel32.GetCurrentProcess()
    counters = ProcessMemoryCounters()
    counters.cb = ctypes.sizeof(counters)
    ok = psapi.GetProcessMemoryInfo(handle, ctypes.byref(counters), counters.cb)
    if not ok:
        raise OSError("GetProcessMemoryInfo failed")
    return int(counters.working_set_size), int(counters.peak_working_set_size)


def compositions(total: int, slots: int):
    """Positive compositions, independently encoded by separator positions."""
    for cuts in itertools.combinations(range(1, total), slots - 1):
        points = (0, *cuts, total)
        yield tuple(points[index + 1] - points[index] for index in range(slots))


def canonical(lengths: tuple[int, ...]) -> bool:
    """One representative under S3 on Q leaves and S2 on C leaves."""
    return lengths[2] <= lengths[3] <= lengths[4] and lengths[6] <= lengths[7]


def compose(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    """Return left after right, for permutations acting on edge indices."""
    return tuple(left[right[index]] for index in range(len(left)))


def automorphism_group() -> tuple[tuple[int, ...], ...]:
    identity = tuple(range(EDGE_COUNT))

    def swap(*pairs: tuple[int, int]) -> tuple[int, ...]:
        row = list(identity)
        for left, right in pairs:
            row[left], row[right] = row[right], row[left]
        return tuple(row)

    generators = (
        swap((2, 3)),
        swap((3, 4)),
        swap((6, 7)),
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
    assert len(group) == 12
    return tuple(sorted(group))


def cycle_lengths(permutation: tuple[int, ...]) -> tuple[int, ...]:
    seen: set[int] = set()
    lengths = []
    for start in range(len(permutation)):
        if start in seen:
            continue
        length = 0
        vertex = start
        while vertex not in seen:
            seen.add(vertex)
            length += 1
            vertex = permutation[vertex]
        lengths.append(length)
    return tuple(sorted(lengths))


def fixed_positive_compositions(weights: tuple[int, ...], total: int) -> int:
    """Count positive cycle-values satisfying sum(weight_i*x_i)=total."""
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


def burnside_orbit_count() -> tuple[int, dict[str, dict[str, int]]]:
    by_cycle_type: dict[str, dict[str, int]] = {}
    fixed_sum = 0
    for permutation in automorphism_group():
        cycles = cycle_lengths(permutation)
        fixed = fixed_positive_compositions(cycles, TOTAL_LENGTH)
        key = ",".join(str(value) for value in cycles)
        row = by_cycle_type.setdefault(key, {"group_elements": 0, "fixed_each": fixed})
        assert row["fixed_each"] == fixed
        row["group_elements"] += 1
        fixed_sum += fixed
    assert fixed_sum % 12 == 0
    return fixed_sum // 12, by_cycle_type


def subdivision(lengths: tuple[int, ...]) -> list[list[int]]:
    order = SKELETON_VERTICES + sum(lengths) - len(lengths)
    assert order == ORDER
    adjacency: list[list[int]] = [[] for _ in range(order)]
    next_vertex = SKELETON_VERTICES
    for (left, right), length in zip(SKELETON_EDGES, lengths, strict=True):
        previous = left
        for _ in range(1, length):
            vertex = next_vertex
            next_vertex += 1
            adjacency[previous].append(vertex)
            adjacency[vertex].append(previous)
            previous = vertex
        adjacency[previous].append(right)
        adjacency[right].append(previous)
    assert next_vertex == ORDER
    return adjacency


def multiply(left: list[int], right: list[int]) -> list[int]:
    out = [0] * (MAX_RANK + 1)
    for left_rank, left_value in enumerate(left):
        for right_rank, right_value in enumerate(right[: MAX_RANK + 1 - left_rank]):
            out[left_rank + right_rank] += left_value * right_value
    return out


def add(left: list[int], right: list[int]) -> list[int]:
    return [a + b for a, b in zip(left, right, strict=True)]


def rooted_states(adjacency: list[list[int]], root: int) -> tuple[list[int], list[int], set[int]]:
    """Independent rooted-tree DP: absent and present polynomials at root."""
    seen: set[int] = set()

    def visit(vertex: int, parent: int) -> tuple[list[int], list[int]]:
        assert vertex not in seen
        seen.add(vertex)
        absent = [1] + [0] * MAX_RANK
        present_unshifted = [1] + [0] * MAX_RANK
        for neighbor in adjacency[vertex]:
            if neighbor == parent:
                continue
            child_absent, child_present = visit(neighbor, vertex)
            absent = multiply(absent, add(child_absent, child_present))
            present_unshifted = multiply(present_unshifted, child_absent)
        present = [0] + present_unshifted[:MAX_RANK]
        return absent, present

    absent, present = visit(root, -1)
    return absent, present, seen


def literal_deleted_forest_polynomial(adjacency: list[list[int]], removed: int) -> list[int]:
    """Delete the root in the literal graph, then multiply its components."""
    seen = {removed}

    def visit(vertex: int, parent: int) -> tuple[list[int], list[int]]:
        assert vertex not in seen
        seen.add(vertex)
        absent = [1] + [0] * MAX_RANK
        present_unshifted = [1] + [0] * MAX_RANK
        for neighbor in adjacency[vertex]:
            if neighbor == parent or neighbor == removed:
                continue
            child_absent, child_present = visit(neighbor, vertex)
            absent = multiply(absent, add(child_absent, child_present))
            present_unshifted = multiply(present_unshifted, child_absent)
        return absent, [0] + present_unshifted[:MAX_RANK]

    forest = [1] + [0] * MAX_RANK
    for vertex in range(len(adjacency)):
        if vertex in seen:
            continue
        absent, present = visit(vertex, -1)
        forest = multiply(forest, add(absent, present))
    assert len(seen) == len(adjacency)
    return forest


def residual(core: list[int], deleted: list[int], siblings: int) -> int:
    smooth7 = sum(math.comb(siblings, index) * core[7 - index] for index in range(8))
    smooth8 = sum(math.comb(siblings, index) * core[8 - index] for index in range(9))
    open9 = sum(math.comb(siblings, index) * core[9 - index] for index in range(1, 10))
    p7 = smooth7 + deleted[6]
    p8 = smooth8 + deleted[7]
    q8 = 16 * p8 * p8 - p7 * p8 - 18 * p7 * open9
    core_q = 16 * core[8] * core[8] - core[7] * core[8]
    deleted_q = 14 * deleted[7] * deleted[7] - deleted[6] * deleted[7]
    return (
        8 * core[7] * deleted[6] * q8
        - 8 * deleted[6] * p7 * core_q
        - 9 * core[7] * p7 * deleted_q
    )


def deltas(core: list[int], deleted: list[int]) -> tuple[int, int, int, int]:
    rows = [residual(core, deleted, siblings) for siblings in range(1, 5)]
    return (
        rows[0],
        rows[1] - rows[0],
        rows[2] - 2 * rows[1] + rows[0],
        rows[3] - 3 * rows[2] + 3 * rows[1] - rows[0],
    )


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == PASS_PRIMARY
    assert primary["nonpositive"] == [0, 0, 0, 0]

    started = time.perf_counter()
    raw_count = math.comb(TOTAL_LENGTH - 1, EDGE_COUNT - 1)
    assert raw_count == 480700
    burnside_count, burnside_cycle_types = burnside_orbit_count()
    assert burnside_count == 70854

    canonical_count = 0
    literal_tree_checks = 0
    literal_deletion_checks = 0
    nonpositive = [0, 0, 0, 0]
    minima: list[dict[str, object] | None] = [None, None, None, None]
    value_stream = hashlib.sha256()
    expected_degree_multiset = Counter({1: 6, 2: 18, 3: 2, 4: 1})

    for lengths in compositions(TOTAL_LENGTH, EDGE_COUNT):
        if not canonical(lengths):
            continue
        canonical_count += 1
        adjacency = subdivision(lengths)
        degrees = Counter(len(neighbors) for neighbors in adjacency)
        assert degrees == expected_degree_multiset
        assert sum(map(len, adjacency)) == 2 * (ORDER - 1)
        surplus = sum(math.comb(max(degree - 1, 0), 2) for degree in degrees.elements())
        assert surplus == 5

        root_absent, root_present, seen = rooted_states(adjacency, 0)
        assert len(seen) == ORDER
        core = add(root_absent, root_present)
        deleted = literal_deleted_forest_polynomial(adjacency, 0)
        assert deleted == root_absent
        literal_tree_checks += 1
        literal_deletion_checks += 1

        values = deltas(core, deleted)
        value_stream.update((",".join(map(str, lengths)) + ":" + ",".join(map(str, values)) + "\n").encode())
        for rank, value in enumerate(values):
            if value <= 0:
                nonpositive[rank] += 1
            if minima[rank] is None or value < minima[rank]["value"]:
                minima[rank] = {
                    "value": value,
                    "lengths": list(lengths),
                    "root": 0,
                    "core": core,
                    "deleted": deleted,
                }
        if canonical_count % 4096 == 0:
            current, _ = process_memory()
            if current >= HARD_RSS_LIMIT:
                raise MemoryError(f"audit RSS {current} reached hard limit {HARD_RSS_LIMIT}")
            print("AUDIT_PROGRESS", canonical_count, flush=True)

    assert canonical_count == burnside_count == primary["canonical_subdivisions"] == 70854
    assert literal_tree_checks == primary["literal_root_checks"] == 70854
    assert literal_deletion_checks == 70854
    assert nonpositive == primary["nonpositive"] == [0, 0, 0, 0]

    minimum_replays = []
    for rank, minimum in enumerate(minima):
        assert minimum is not None
        primary_minimum = primary["minima"][str(rank)]
        assert minimum["value"] == int(primary_minimum["value"])
        assert minimum["lengths"] == primary_minimum["lengths"]
        assert minimum["root"] == primary_minimum["root"] == 0
        assert minimum["core"] == primary_minimum["core"]
        assert minimum["deleted"] == primary_minimum["deleted"]
        minimum_replays.append({"delta": rank, **minimum})

    current_rss, peak_rss = process_memory()
    assert current_rss < HARD_RSS_LIMIT and peak_rss < HARD_RSS_LIMIT
    payload = {
        "schema": "rank8-delta03-e5-quartic-endpoint-cubic-path-quartic-root-order27-independent-audit-agent-v1",
        "status": PASS_AUDIT,
        "audit_claim": (
            "A separately transcribed Python arbitrary-integer engine enumerated the full canonical quotient, "
            "rebuilt every literal 27-vertex tree, independently deleted the endpoint quartic root as a forest, "
            "recomputed Delta0..3, and matched the primary minima exactly."
        ),
        "no_gap_enumeration": {
            "raw_positive_compositions": raw_count,
            "automorphism_group_order": 12,
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
            "hard_rss_limit_bytes": HARD_RSS_LIMIT,
        },
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Exactly e=5, n=27, quartic_endpoint_cubic_path:quartic_branch, Delta0..3. "
            "No other root orbit, e=5 skeleton, order, forest-Q8, PGC, or Problem 993 claim."
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


