#!/usr/bin/env python3
"""Independent geng/deletion replay of the order-16/17 component-jet catalog."""

from __future__ import annotations

import ctypes
import functools
import hashlib
import json
import subprocess
from fractions import Fraction
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_forest16_17_component_jet_bounds_independent_audit_agent_20260823.json"
GENG = HERE / "nauty2_8_9" / "geng.exe"
ABORT_BYTES = 424 * 1024**2
EXPECTED_TREE_COUNTS = [0, 1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1301, 3159, 7741, 19320, 48629]
EXPECTED = {
    "prove_rank8_forest16_17_component_jet_bounds_agent.py":
        "F3BA34249C4A0D7FAD4B135D38EB121FED86AD6A31289A846BC1D3B13018C032",
    "rank8_forest16_17_component_jet_bounds_exact_agent_20260823.json":
        "DC5A2F6F85E62D47EB0AA43FB8E92B2C33E04DF3DA828AFF179B9E61B52F032D",
    "nauty2_8_9/geng.exe":
        "53D8544CF73604C087730CFABA4FB1881A20D6B329B1F9B5B965546417D22DA4",
}


class PROCESS_MEMORY_COUNTERS_EX(ctypes.Structure):
    _fields_ = [
        ("cb", ctypes.c_ulong),
        ("PageFaultCount", ctypes.c_ulong),
        ("PeakWorkingSetSize", ctypes.c_size_t),
        ("WorkingSetSize", ctypes.c_size_t),
        ("QuotaPeakPagedPoolUsage", ctypes.c_size_t),
        ("QuotaPagedPoolUsage", ctypes.c_size_t),
        ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t),
        ("QuotaNonPagedPoolUsage", ctypes.c_size_t),
        ("PrivateUsage", ctypes.c_size_t),
        ("PeakPagefileUsage", ctypes.c_size_t),
    ]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def private_bytes() -> int:
    counters = PROCESS_MEMORY_COUNTERS_EX()
    counters.cb = ctypes.sizeof(counters)
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    psapi = ctypes.WinDLL("psapi", use_last_error=True)
    kernel32.GetCurrentProcess.restype = ctypes.c_void_p
    psapi.GetProcessMemoryInfo.argtypes = (
        ctypes.c_void_p,
        ctypes.POINTER(PROCESS_MEMORY_COUNTERS_EX),
        ctypes.c_ulong,
    )
    if not psapi.GetProcessMemoryInfo(
        kernel32.GetCurrentProcess(), ctypes.byref(counters), counters.cb
    ):
        raise ctypes.WinError()
    return int(counters.PrivateUsage)


def gate() -> int:
    value = private_bytes()
    if value > ABORT_BYTES:
        raise MemoryError(f"private bytes {value} exceed {ABORT_BYTES}")
    return value


def add(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(left[index] + right[index] for index in range(7))


def multiply(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    answer = [0] * 7
    for total in range(7):
        answer[total] = sum(left[index] * right[total - index] for index in range(total + 1))
    return tuple(answer)


def deletion_jet(graph: nx.Graph) -> tuple[int, ...]:
    """Literal deletion/closed-neighborhood recursion, independent of rooted DP."""
    vertices = sorted(graph)
    position = {vertex: index for index, vertex in enumerate(vertices)}
    adjacency = [0] * len(vertices)
    for vertex in vertices:
        index = position[vertex]
        for neighbor in graph[vertex]:
            adjacency[index] |= 1 << position[neighbor]

    @functools.lru_cache(maxsize=None)
    def visit(mask: int) -> tuple[int, ...]:
        if mask == 0:
            return (1, 0, 0, 0, 0, 0, 0)
        bit = mask & -mask
        vertex = bit.bit_length() - 1
        excluded = visit(mask ^ bit)
        included_small = visit(mask & ~bit & ~adjacency[vertex])
        return add(excluded, (0,) + included_small[:6])

    return visit((1 << len(vertices)) - 1)


def sparse_hash(rows) -> str:
    digest = hashlib.sha256()
    for label, values in rows:
        digest.update(str(label).encode())
        digest.update(b":")
        for value in sorted(values):
            digest.update(",".join(str(item) for item in value).encode())
            digest.update(b";")
        digest.update(b"\n")
    return digest.hexdigest().upper()


def geng_codes(order: int) -> list[bytes]:
    edge_count = order - 1
    result = subprocess.run(
        [str(GENG), "-cq", str(order), f"{edge_count}:{edge_count}"],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    assert result.stderr == b"", result.stderr
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def forest_type_counts(tree_counts: list[int], target: int) -> dict[int, int]:
    """Unbounded-knapsack replay, processing each free-tree type separately."""
    table = [[0] * (target + 1) for _ in range(target + 1)]
    table[0][0] = 1
    for component_order in range(1, target + 1):
        for _ in range(tree_counts[component_order]):
            for total in range(component_order, target + 1):
                for components in range(1, target + 1):
                    table[total][components] += table[total - component_order][components - 1]
    return {components: table[target][components] for components in range(1, target + 1)}


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    primary = json.loads(
        (HERE / "rank8_forest16_17_component_jet_bounds_exact_agent_20260823.json").read_text(
            encoding="utf-8"
        )
    )
    assert primary["status"] == "PASS_EXACT_FOREST16_17_COMPONENT_JET_BOUNDS"

    peak = gate()
    tree_types: dict[int, set[tuple[int, ...]]] = {}
    tree_counts = [0]
    geng_stream = hashlib.sha256()
    for order in range(1, 18):
        codes = geng_codes(order)
        jets = set()
        for code in reversed(codes):
            graph = nx.from_graph6_bytes(code)
            assert graph.number_of_nodes() == order
            assert graph.number_of_edges() == order - 1
            assert nx.is_tree(graph)
            jets.add(deletion_jet(graph))
            geng_stream.update(f"order={order};".encode())
            geng_stream.update(code)
            geng_stream.update(b"\n")
        tree_types[order] = jets
        tree_counts.append(len(codes))
        peak = max(peak, gate())
    assert tree_counts == EXPECTED_TREE_COUNTS
    tree_fingerprint = sparse_hash(sorted(tree_types.items()))
    assert tree_fingerprint == primary["enumeration"]["tree_jet_sparse_sha256"]

    unit = (1, 0, 0, 0, 0, 0, 0)
    forests: dict[tuple[int, int], set[tuple[int, ...]]] = {(0, 0): {unit}}
    # Reverse component-order and value traversals provide a transcription distinct
    # from the producer. Sets remove ordered decompositions without changing jets.
    for total in range(1, 18):
        for component_order in reversed(range(1, total + 1)):
            remainder = total - component_order
            for components in reversed(range(remainder + 1)):
                old_values = forests.get((remainder, components))
                if not old_values:
                    continue
                target = forests.setdefault((total, components + 1), set())
                for old in reversed(sorted(old_values)):
                    for component in reversed(sorted(tree_types[component_order])):
                        target.add(multiply(old, component))
        peak = max(peak, gate())

    replay_rows = []
    summaries = {}
    forest_fingerprints = {}
    for order in (16, 17):
        counts = forest_type_counts(tree_counts, order)
        primary_rows = [row for row in primary["component_rows"] if row["order"] == order]
        for primary_row in primary_rows:
            components = primary_row["components"]
            values = forests[(order, components)]
            minima = [min(value[index] for value in values) for index in range(5)]
            maximum = max(values, key=lambda value: Fraction(value[5], value[6]))
            row = {
                "order": order,
                "components": components,
                "unlabeled_forest_types": counts[components],
                "distinct_coefficient_jets": len(values),
                "minimum_f0_to_f4": minima,
                "maximum_f5_over_f6": f"{maximum[5]}/{maximum[6]}",
                "maximum_jet_f0_to_f6": list(maximum),
            }
            assert row == primary_row, (row, primary_row)
            replay_rows.append(row)
        global_max = max(
            (value for components in range(1, order + 1) for value in forests[(order, components)]),
            key=lambda value: Fraction(value[5], value[6]),
        )
        summary = {
            "unlabeled_forest_types": sum(counts.values()),
            "distinct_coefficient_jets": sum(row["distinct_coefficient_jets"] for row in replay_rows if row["order"] == order),
            "global_maximum_f5_over_f6": f"{global_max[5]}/{global_max[6]}",
            "global_maximum_jet_f0_to_f6": list(global_max),
        }
        assert summary == primary["order_summaries"][str(order)]
        summaries[str(order)] = summary
        fingerprint = sparse_hash(
            (components, forests[(order, components)]) for components in range(1, order + 1)
        )
        assert fingerprint == primary["enumeration"]["forest_jet_sparse_sha256"][str(order)]
        forest_fingerprints[str(order)] = fingerprint

    payload = {
        "schema": "rank8-forest16-17-component-jet-bounds-independent-audit-v1",
        "status": "PASS_INDEPENDENT_GENG_DELETION_REPLAY_FOREST16_17_COMPONENT_JET_BOUNDS",
        "hashes": hashes,
        "method": (
            "nauty geng independently enumerated every free tree through order 17; "
            "literal deletion/closed-neighborhood recursion rebuilt coefficient jets; "
            "reverse-order component products and an independent unbounded-knapsack "
            "count replay rebuilt all component-resolved order-16/17 rows."
        ),
        "counts": {
            "free_trees_through_17": sum(tree_counts),
            "order_summaries": summaries,
            "component_rows_replayed": len(replay_rows),
        },
        "tree_jet_sparse_sha256": tree_fingerprint,
        "forest_jet_sparse_sha256": forest_fingerprints,
        "geng_reverse_stream_sha256": geng_stream.hexdigest().upper(),
        "resources": {
            "abort_private_bytes": ABORT_BYTES,
            "peak_private_bytes": peak,
            "peak_private_MiB": peak / 1024**2,
        },
        "proof_boundary": primary["proof_boundary"],
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SUMMARIES", summaries)
    print("PEAK_MIB", payload["resources"]["peak_private_MiB"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
