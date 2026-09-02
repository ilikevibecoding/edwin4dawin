#!/usr/bin/env python3
"""Independent nauty/geng replay of the order-16 forest ratio theorem."""

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
OUTPUT = HERE / "rank8_forest16_f5_f6_ratio_independent_audit_agent_20260823.json"
GENG = HERE / "nauty2_8_9" / "geng.exe"
ABORT_BYTES = 424 * 1024**2
EXPECTED = {
    "prove_rank8_forest16_f5_f6_ratio_agent.py":
        "D2D9E23E930904B3C55EF5BB2B75D5CBB5D389A39B0A0F1AE7CA1B3A61BFDB21",
    "rank8_forest16_f5_f6_ratio_exact_agent_20260823.json":
        "91E071946534CA6AF36ED4F121639F895F2A9E3F3D405E048EB64858D692D196",
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
        ("PagefileUsage", ctypes.c_size_t),
        ("PeakPagefileUsage", ctypes.c_size_t),
        ("PrivateUsage", ctypes.c_size_t),
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


def plus(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(left[index] + right[index] for index in range(7))


def convolution(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    answer = [0] * 7
    for total in range(7):
        answer[total] = sum(
            left[index] * right[total - index]
            for index in range(total + 1)
        )
    return tuple(answer)


def deletion_jet(graph: nx.Graph) -> tuple[int, ...]:
    """Deletion/closed-neighborhood recurrence, independent of rooted DP."""
    vertices = sorted(graph)
    position = {vertex: index for index, vertex in enumerate(vertices)}
    adjacency = [0] * len(vertices)
    for vertex in vertices:
        index = position[vertex]
        for neighbor in graph[vertex]:
            adjacency[index] |= 1 << position[neighbor]

    @functools.lru_cache(maxsize=None)
    def visit(mask: int) -> tuple[int, ...]:
        if not mask:
            return (1, 0, 0, 0, 0, 0, 0)
        bit = 1 << (mask.bit_length() - 1)
        vertex = bit.bit_length() - 1
        excluded = visit(mask ^ bit)
        smaller = visit(mask & ~bit & ~adjacency[vertex])
        included = (0,) + smaller[:6]
        return plus(excluded, included)

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
    command = [str(GENG), "-cq", str(order), f"{edge_count}:{edge_count}"]
    result = subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    assert not result.stderr
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def independent_forest_type_counts(tree_counts: list[int]):
    # Process each free-tree isomorphism type as one unbounded knapsack item.
    table = [[0] * 17 for _ in range(17)]
    table[0][0] = 1
    for component_order in range(1, 17):
        for _ in range(tree_counts[component_order]):
            for total in range(component_order, 17):
                for components in range(1, 17):
                    table[total][components] += table[total - component_order][components - 1]
    return {components: table[16][components] for components in range(1, 17)}


def main() -> None:
    hashes = {
        name: sha256(HERE / name) for name in EXPECTED
    }
    assert hashes == EXPECTED, (hashes, EXPECTED)
    primary = json.loads(
        (HERE / "rank8_forest16_f5_f6_ratio_exact_agent_20260823.json").read_text(
            encoding="utf-8"
        )
    )
    assert primary["status"] == "PASS_EXACT_FOREST16_12F6_GE_7F5"

    peak = gate()
    tree_types = {}
    tree_counts = [0]
    geng_stream = hashlib.sha256()
    for order in range(1, 17):
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
    assert tree_counts == [0] + [
        primary["enumeration"]["tree_counts"][str(order)] for order in range(1, 17)
    ]
    tree_fingerprint = sparse_hash(sorted(tree_types.items()))
    assert tree_fingerprint == primary["enumeration"]["tree_jet_sparse_sha256"]

    unit = (1, 0, 0, 0, 0, 0, 0)
    forests = {(0, 0): {unit}}
    # Reverse component-order traversal and use a fixed-point union at each
    # total order; set equality makes ordered duplicates harmless.
    for total in range(1, 17):
        for component_order in reversed(range(1, total + 1)):
            remainder = total - component_order
            for components in reversed(range(0, remainder + 1)):
                old_values = forests.get((remainder, components))
                if not old_values:
                    continue
                target = forests.setdefault((total, components + 1), set())
                for old in reversed(sorted(old_values)):
                    for component in reversed(sorted(tree_types[component_order])):
                        target.add(convolution(old, component))
        peak = max(peak, gate())

    type_counts = independent_forest_type_counts(tree_counts)
    assert sum(type_counts.values()) == primary["enumeration"]["unlabeled_forests_order16"] == 49905
    forest_fingerprint = sparse_hash(
        (components, forests[(16, components)]) for components in range(1, 17)
    )
    assert forest_fingerprint == primary["enumeration"]["forest16_jet_sparse_sha256"]

    replay_rows = []
    for primary_row in primary["rows"]:
        components = primary_row["components"]
        values = forests[(16, components)]
        margins = [(12 * value[6] - 7 * value[5], value) for value in values]
        minimum_margin, minimum_jet = min(margins)
        maximum_jet = max(values, key=lambda value: Fraction(value[5], value[6]))
        equality = sorted(value for margin, value in margins if margin == 0)
        row = {
            "components": components,
            "unlabeled_forest_types": type_counts[components],
            "distinct_coefficient_jets": len(values),
            "minimum_12f6_minus_7f5": minimum_margin,
            "minimum_jet_f0_to_f6": list(minimum_jet),
            "maximum_f5_over_f6": f"{maximum_jet[5]}/{maximum_jet[6]}",
            "maximum_jet_f0_to_f6": list(maximum_jet),
            "equality_jets": [list(value) for value in equality],
        }
        assert row == primary_row
        replay_rows.append(row)
    assert sum(row["distinct_coefficient_jets"] for row in replay_rows) == 28933
    assert min(row["minimum_12f6_minus_7f5"] for row in replay_rows) == 0

    payload = {
        "schema": "rank8-forest16-f5-f6-ratio-independent-audit-v1",
        "status": "PASS_INDEPENDENT_GENG_DELETION_REPLAY_FOREST16_12F6_GE_7F5",
        "hashes": hashes,
        "method": (
            "nauty geng independently enumerated each free-tree catalog; a local "
            "deletion/closed-neighborhood recurrence rebuilt rank-0..6 jets; a "
            "reverse-order component-product DP rebuilt every order-16 forest jet."
        ),
        "counts": {
            "free_trees": sum(tree_counts),
            "unlabeled_forests_order16": sum(type_counts.values()),
            "distinct_order16_coefficient_jets": sum(
                row["distinct_coefficient_jets"] for row in replay_rows
            ),
        },
        "tree_jet_sparse_sha256": tree_fingerprint,
        "forest16_jet_sparse_sha256": forest_fingerprint,
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
    print("TREES", payload["counts"]["free_trees"], "FORESTS", payload["counts"]["unlabeled_forests_order16"], "JETS", payload["counts"]["distinct_order16_coefficient_jets"])
    print("PEAK_MIB", payload["resources"]["peak_private_MiB"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
