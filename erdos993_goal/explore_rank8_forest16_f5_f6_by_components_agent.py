#!/usr/bin/env python3
"""Low-memory exact exploration of f5/f6 for order-16 forests."""

from __future__ import annotations

import hashlib
import json
import ctypes
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_forest16_f5_f6_by_components_exploration_agent_20260823.json"
ABORT_BYTES = 424 * 1024**2


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
        ("PagefileUsage", ctypes.c_size_t),
        ("PeakPagefileUsage", ctypes.c_size_t),
        ("PrivateUsage", ctypes.c_size_t),
    ]


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


def gate() -> None:
    value = private_bytes()
    if value > ABORT_BYTES:
        raise MemoryError(f"private bytes {value} exceed {ABORT_BYTES}")


def add(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(left[i] + right[i] for i in range(7))


def multiply(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    answer = [0] * 7
    for i, a in enumerate(left):
        if not a:
            continue
        for j, b in enumerate(right[: 7 - i]):
            answer[i + j] += a * b
    return tuple(answer)


def tree_jet(tree: nx.Graph) -> tuple[int, ...]:
    root = next(iter(tree))
    parent = {root: None}
    order = [root]
    for vertex in order:
        for neighbor in tree[vertex]:
            if neighbor != parent[vertex]:
                parent[neighbor] = vertex
                order.append(neighbor)
    excluded = {}
    included = {}
    one = (1, 0, 0, 0, 0, 0, 0)
    x = (0, 1, 0, 0, 0, 0, 0)
    for vertex in reversed(order):
        out = one
        inside = x
        for child in tree[vertex]:
            if parent.get(child) == vertex:
                out = multiply(out, add(excluded[child], included[child]))
                inside = multiply(inside, excluded[child])
        excluded[vertex] = out
        included[vertex] = inside
    return add(excluded[root], included[root])


def main() -> None:
    peak = private_bytes()
    types = {1: {(1, 1, 0, 0, 0, 0, 0)}}
    tree_counts = {1: 1}
    graph6_digest = hashlib.sha256()
    graph6_digest.update(b"order=1;@\n")
    for order in range(2, 17):
        jets = set()
        count = 0
        for tree in nx.nonisomorphic_trees(order):
            count += 1
            jets.add(tree_jet(tree))
            graph6_digest.update(f"order={order};".encode())
            graph6_digest.update(nx.to_graph6_bytes(tree, header=False).strip())
            graph6_digest.update(b"\n")
        types[order] = jets
        tree_counts[order] = count
        peak = max(peak, private_bytes())
        gate()

    zero = (1, 0, 0, 0, 0, 0, 0)
    states = {(0, 0): {zero}}
    for order in range(1, 17):
        for component_order in range(1, order + 1):
            remainder = order - component_order
            for (old_order, old_components), old_jets in list(states.items()):
                if old_order != remainder:
                    continue
                target = states.setdefault((order, old_components + 1), set())
                for tree_value in types[component_order]:
                    for forest_value in old_jets:
                        target.add(multiply(tree_value, forest_value))
        peak = max(peak, private_bytes())
        gate()

    rows = []
    for components in range(1, 17):
        values = states.get((16, components), set())
        eligible = [value for value in values if value[6] > 0]
        maximum = max(eligible, key=lambda value: value[5] / value[6])
        rows.append(
            {
                "components": components,
                "distinct_coefficient_jets": len(values),
                "eligible_f6_positive_jets": len(eligible),
                "maximum_f5_over_f6": f"{maximum[5]}/{maximum[6]}",
                "maximizing_jet_f0_to_f6": list(maximum),
            }
        )

    payload = {
        "schema": "rank8-forest16-f5-f6-by-components-exploration-v1",
        "status": "EXACT_EXPLORATION_NO_THEOREM_CREDIT",
        "tree_counts": tree_counts,
        "unique_tree_jets": {str(k): len(v) for k, v in types.items()},
        "graph6_stream_sha256": graph6_digest.hexdigest().upper(),
        "rows": rows,
        "resources": {
            "abort_private_bytes": ABORT_BYTES,
            "peak_private_bytes": peak,
            "peak_private_MiB": peak / 1024**2,
        },
        "proof_boundary": (
            "Exploratory coefficient-jet enumeration only.  It is not an "
            "independent canonical forest enumeration and receives no theorem credit."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("TREES", sum(tree_counts.values()), "FOREST16_JETS", sum(row["distinct_coefficient_jets"] for row in rows))
    print("PEAK_MIB", payload["resources"]["peak_private_MiB"])
    for row in rows:
        print(row["components"], row["maximum_f5_over_f6"], row["maximizing_jet_f0_to_f6"])


if __name__ == "__main__":
    main()
