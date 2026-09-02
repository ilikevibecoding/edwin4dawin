#!/usr/bin/env python3
"""Exact finite proof that 12*i6 >= 7*i5 for every order-16 forest."""

from __future__ import annotations

import ctypes
import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_forest16_f5_f6_ratio_exact_agent_20260823.json"
ABORT_BYTES = 424 * 1024**2
EXPECTED_TREE_COUNTS = (0, 1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1301, 3159, 7741, 19320)


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


def gate() -> int:
    value = private_bytes()
    if value > ABORT_BYTES:
        raise MemoryError(f"private bytes {value} exceed {ABORT_BYTES}")
    return value


def add(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(left[index] + right[index] for index in range(7))


def multiply(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    answer = [0] * 7
    for i, a in enumerate(left):
        if a:
            for j, b in enumerate(right[: 7 - i]):
                answer[i + j] += a * b
    return tuple(answer)


def tree_jet(tree: nx.Graph) -> tuple[int, ...]:
    """Included/excluded rooted-tree DP, truncated only above rank six."""
    root = next(iter(tree))
    parent = {root: None}
    traversal = [root]
    for vertex in traversal:
        for neighbor in tree[vertex]:
            if neighbor != parent[vertex]:
                parent[neighbor] = vertex
                traversal.append(neighbor)
    excluded = {}
    included = {}
    one = (1, 0, 0, 0, 0, 0, 0)
    x = (0, 1, 0, 0, 0, 0, 0)
    for vertex in reversed(traversal):
        out = one
        inside = x
        for child in tree[vertex]:
            if parent.get(child) == vertex:
                out = multiply(out, add(excluded[child], included[child]))
                inside = multiply(inside, excluded[child])
        excluded[vertex] = out
        included[vertex] = inside
    return add(excluded[root], included[root])


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


def forest_type_counts(tree_counts: tuple[int, ...]):
    # Coefficients of product_s (1-y*x^s)^(-tree_counts[s]).
    states = {(0, 0): 1}
    for order in range(1, 17):
        updated = {}
        for (old_n, old_c), count in states.items():
            maximum = (16 - old_n) // order
            for copies in range(maximum + 1):
                key = (old_n + copies * order, old_c + copies)
                multiplicity = math.comb(tree_counts[order] + copies - 1, copies)
                updated[key] = updated.get(key, 0) + count * multiplicity
        states = updated
    return {components: states.get((16, components), 0) for components in range(1, 17)}


def main() -> None:
    peak = gate()
    graph6_stream = hashlib.sha256()
    tree_types = {1: {(1, 1, 0, 0, 0, 0, 0)}}
    tree_counts = [0, 1]
    graph6_stream.update(b"order=1;@\n")
    for order in range(2, 17):
        jets = set()
        count = 0
        for tree in nx.nonisomorphic_trees(order):
            count += 1
            jets.add(tree_jet(tree))
            graph6_stream.update(f"order={order};".encode())
            graph6_stream.update(nx.to_graph6_bytes(tree, header=False).strip())
            graph6_stream.update(b"\n")
        tree_types[order] = jets
        tree_counts.append(count)
        peak = max(peak, gate())
    assert tuple(tree_counts) == EXPECTED_TREE_COUNTS
    assert sum(tree_counts) == 32508

    unit = (1, 0, 0, 0, 0, 0, 0)
    forests = {(0, 0): {unit}}
    for total_order in range(1, 17):
        for component_order in range(1, total_order + 1):
            remainder = total_order - component_order
            sources = [
                (components, values)
                for (order, components), values in forests.items()
                if order == remainder
            ]
            for components, old_values in sources:
                target = forests.setdefault((total_order, components + 1), set())
                for component in tree_types[component_order]:
                    for old in old_values:
                        target.add(multiply(old, component))
        peak = max(peak, gate())

    type_counts = forest_type_counts(tuple(tree_counts))
    assert type_counts == {
        1: 19320, 2: 15437, 3: 8225, 4: 3829,
        5: 1707, 6: 757, 7: 339, 8: 154,
        9: 71, 10: 34, 11: 16, 12: 8,
        13: 4, 14: 2, 15: 1, 16: 1,
    }
    assert sum(type_counts.values()) == 49905

    rows = []
    equality_jets = []
    global_minimum = None
    for components in range(1, 17):
        values = forests[(16, components)]
        assert all(value[6] > 0 for value in values)
        margins = [(12 * value[6] - 7 * value[5], value) for value in values]
        minimum_margin, minimum_jet = min(margins)
        assert minimum_margin >= 0
        equal = sorted(value for margin, value in margins if margin == 0)
        equality_jets.extend((components, value) for value in equal)
        maximum_jet = max(
            values, key=lambda value: Fraction(value[5], value[6])
        )
        rows.append(
            {
                "components": components,
                "unlabeled_forest_types": type_counts[components],
                "distinct_coefficient_jets": len(values),
                "minimum_12f6_minus_7f5": minimum_margin,
                "minimum_jet_f0_to_f6": list(minimum_jet),
                "maximum_f5_over_f6": f"{maximum_jet[5]}/{maximum_jet[6]}",
                "maximum_jet_f0_to_f6": list(maximum_jet),
                "equality_jets": [list(value) for value in equal],
            }
        )
        global_minimum = (
            minimum_margin if global_minimum is None else min(global_minimum, minimum_margin)
        )
    assert equality_jets == [
        (1, (1, 16, 105, 364, 715, 792, 462))
    ]
    forest_jet_count = sum(row["distinct_coefficient_jets"] for row in rows)
    assert forest_jet_count == 28933

    payload = {
        "schema": "rank8-forest16-f5-f6-ratio-v1",
        "status": "PASS_EXACT_FOREST16_12F6_GE_7F5",
        "theorem": (
            "For every forest F on 16 vertices, 12*i6(F)>=7*i5(F); "
            "equivalently i5(F)/i6(F)<=12/7."
        ),
        "enumeration": {
            "method": (
                "NetworkX free-tree generation through order 16; independent-set "
                "jets by rooted included/excluded DP; all forest jets by the unique "
                "multiset-of-tree-components decomposition."
            ),
            "tree_counts": {str(i): tree_counts[i] for i in range(1, 17)},
            "free_trees_total": sum(tree_counts),
            "unlabeled_forests_order16": sum(type_counts.values()),
            "distinct_order16_coefficient_jets": forest_jet_count,
            "graph6_stream_sha256": graph6_stream.hexdigest().upper(),
            "tree_jet_sparse_sha256": sparse_hash(sorted(tree_types.items())),
            "forest16_jet_sparse_sha256": sparse_hash(
                ((components, forests[(16, components)]) for components in range(1, 17))
            ),
        },
        "rows": rows,
        "global_minimum_12f6_minus_7f5": global_minimum,
        "unique_equality_jet": {
            "components": 1,
            "jet_f0_to_f6": list(equality_jets[0][1]),
            "identification": "the order-16 path independence jet",
        },
        "resources": {
            "abort_private_bytes": ABORT_BYTES,
            "peak_private_bytes": peak,
            "peak_private_MiB": peak / 1024**2,
        },
        "versions": {
            "networkx": nx.__version__,
        },
        "proof_boundary": (
            "This finite theorem is only the adjacent coefficient inequality at "
            "ranks 5 and 6 for order-16 forests.  It does not itself prove any "
            "leaf-extension gate, mask, connected Q8 case, or Problem 993."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    source_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    report_hash = hashlib.sha256(OUTPUT.read_bytes()).hexdigest().upper()
    print(payload["status"])
    print("TREES", sum(tree_counts), "FORESTS", sum(type_counts.values()), "JETS", forest_jet_count)
    print("MIN", global_minimum, "PEAK_MIB", payload["resources"]["peak_private_MiB"])
    print("SOURCE", source_hash)
    print("REPORT", report_hash)


if __name__ == "__main__":
    main()
