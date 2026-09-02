#!/usr/bin/env python3
"""Independent geng/bitmask replay of the 2,495 literal attachment closure."""

from __future__ import annotations

import ctypes
import functools
import gc
import hashlib
import itertools
import json
import math
import subprocess
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

import networkx as nx

from audit_rank8_delta0_new_leaf_mask3_quantitative_gap_tail_agent import literal_base


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_small_m_2495_literal_attachment_independent_audit_agent_20260823.json"
PRIMARY = HERE / "rank8_delta0_new_leaf_mask3_small_m_2495_literal_attachment_exact_agent_20260823.json"
ENVELOPE = HERE / "rank8_delta0_new_leaf_mask3_n26_39_m0_15_joint_jet_envelope_exact_agent_20260823.json"
GENG = HERE / "nauty2_8_9" / "geng.exe"
ABORT_BYTES = 424 * 1024**2
MODULUS = 1 << 256
EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask3_small_m_2495_literal_attachment_agent.py":
        "23ABB3E543DD19CE9B0E4963675A89099F4A111692049FCC3D971B1BA54EC7CB",
    "rank8_delta0_new_leaf_mask3_small_m_2495_literal_attachment_exact_agent_20260823.json":
        "908E41B8D1426ADA2399EB64D29881FC8A58B7C8579B6A574CEF54151AE9ABFC",
    "prove_rank8_delta0_new_leaf_mask3_n26_39_m0_15_joint_jet_envelope_agent.py":
        "F81DE63D8717991E1BCE03FC936D6B01E07A242F79F78C317BA0137FD672E94F",
    "rank8_delta0_new_leaf_mask3_n26_39_m0_15_joint_jet_envelope_exact_agent_20260823.json":
        "66410DE4223D5EAE6C2F456B26E016791B07F05827EFC1312C2DF8A06B946DAE",
    "audit_rank8_delta0_new_leaf_mask3_quantitative_gap_tail_agent.py":
        "A907744740C12E53A07E9710B8E2BBC1DC44B255D4107B5DBEB639FB4F3998A3",
    "nauty2_8_9/geng.exe":
        "53D8544CF73604C087730CFABA4FB1881A20D6B329B1F9B5B965546417D22DA4",
}
TREE_COUNTS = [0, 1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1301, 3159, 7741]


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


@dataclass(frozen=True)
class Record:
    order: int
    code: bytes
    jet: tuple[int, ...]
    deletion_jets: tuple[tuple[int, ...], ...]


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
    return tuple(a + b for a, b in zip(left, right))


def convolution(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(
        sum(left[index] * right[total - index] for index in range(total + 1))
        for total in range(7)
    )


def literal_graph_jets(graph: nx.Graph):
    """I(G) and every I(G-u), from one literal induced-subgraph recursion."""
    vertices = tuple(sorted(graph))
    position = {vertex: index for index, vertex in enumerate(vertices)}
    closed = []
    for vertex in vertices:
        mask = 1 << position[vertex]
        for neighbor in graph[vertex]:
            mask |= 1 << position[neighbor]
        closed.append(mask)

    @functools.lru_cache(maxsize=None)
    def recurse(mask: int) -> tuple[int, ...]:
        if mask == 0:
            return (1, 0, 0, 0, 0, 0, 0)
        vertex = (mask & -mask).bit_length() - 1
        excluded = recurse(mask ^ (1 << vertex))
        smaller = recurse(mask & ~closed[vertex])
        return plus(excluded, (0,) + smaller[:6])

    full = (1 << len(vertices)) - 1
    jet = recurse(full)
    deletions = tuple(
        sorted({recurse(full ^ (1 << index)) for index in range(len(vertices))})
    )
    return jet, deletions


def geng_codes(order: int):
    edges = order - 1
    result = subprocess.run(
        [str(GENG), "-cq", str(order), f"{edges}:{edges}"],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    assert result.stderr == b"", result.stderr
    return tuple(line.strip() for line in result.stdout.splitlines() if line.strip())


def build_records():
    records = []
    stream = hashlib.sha256()
    counts = [0]
    peak = gate()
    for order in range(1, 16):
        codes = geng_codes(order)
        counts.append(len(codes))
        for code in reversed(codes):
            graph = nx.from_graph6_bytes(code)
            assert nx.is_tree(graph)
            jet, deletions = literal_graph_jets(graph)
            records.append(Record(order, code, jet, deletions))
            stream.update(f"order={order};".encode())
            stream.update(code)
            stream.update(b"\n")
        peak = max(peak, gate())
    assert counts == TREE_COUNTS
    records.sort(key=lambda row: (row.order, row.code))
    return tuple(records), stream.hexdigest().upper(), peak


def multiset_forests(records, total: int, components: int):
    """All multisets of free-tree records, in nondecreasing global index."""
    answer = []

    def recurse(remaining: int, count: int, start: int):
        if count == 0:
            if remaining == 0:
                yield tuple(answer)
            return
        maximum_order = remaining - (count - 1)
        for index in range(start, len(records)):
            order = records[index].order
            if order > maximum_order:
                break
            answer.append(records[index])
            yield from recurse(remaining - order, count - 1, index)
            answer.pop()

    yield from recurse(total, components, 0)


@functools.lru_cache(maxsize=None)
def restricted_growth_strings(size: int):
    if size == 0:
        return ((),)
    answer = []
    sequence = [0]

    def recurse(index: int, maximum: int):
        if index == size:
            answer.append(tuple(sequence))
            return
        for value in range(maximum + 2):
            sequence.append(value)
            recurse(index + 1, max(maximum, value))
            sequence.pop()

    recurse(1, 0)
    return tuple(answer)


def multiply_all(jets) -> tuple[int, ...]:
    result = (1, 0, 0, 0, 0, 0, 0)
    for jet in jets:
        result = convolution(result, jet)
    return result


def quotient_states(components: tuple[Record, ...]):
    result = set()
    p_jets = tuple(component.jet for component in components)
    for deletions in itertools.product(*(component.deletion_jets for component in components)):
        for assignment in restricted_growth_strings(len(components)):
            groups = max(assignment) + 1
            nonempty_product = (1, 0, 0, 0, 0, 0, 0)
            for root in range(groups):
                indices = [index for index, value in enumerate(assignment) if value == root]
                excluded = multiply_all(p_jets[index] for index in indices)
                deleted = multiply_all(deletions[index] for index in indices)
                factor = plus(excluded, (0,) + deleted[:6])
                nonempty_product = convolution(nonempty_product, factor)
            result.add((groups, nonempty_product))
    return result


def cleared_literal_numerator(terms, djet, fjet) -> int:
    total = 0
    for (np, xp, yp, zp), coefficient in reversed(terms):
        assert np == 0 and xp + yp + zp <= 8
        total += (
            int(coefficient)
            * djet[5] ** xp
            * fjet[5] ** yp
            * fjet[6] ** zp
            * djet[6] ** (8 - xp - yp - zp)
        )
    return total


def fingerprint_add(state, signature):
    digest = hashlib.sha256(
        json.dumps(signature, separators=(",", ":")).encode()
    ).digest()
    value = int.from_bytes(digest, "big")
    state[0] ^= value
    state[1] = (state[1] + value) % MODULUS
    state[2] = (state[2] + value * value) % MODULUS


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_MASK3_SMALL_M_2495_LITERAL_ATTACHMENT_CLOSURE"
    envelope = json.loads(ENVELOPE.read_text(encoding="utf-8"))
    residuals = envelope["residual_envelope_jets"]
    assert len(residuals) == 2_495
    targets = defaultdict(set)
    for row in residuals:
        targets[(row["m"], row["components"], tuple(row["jet_f0_to_f6"]))].add(
            (row["N"], row["r"])
        )
    del envelope, residuals
    gc.collect()

    records, geng_stream, peak = build_records()
    terms = literal_base().terms()
    empty = [(1, 0, 0, 0, 0, 0, 0)]
    for _ in range(15):
        empty.append(convolution(empty[-1], (1, 1, 0, 0, 0, 0, 0)))

    expected_scan = {
        tuple(int(part.split("=")[1]) for part in label.split(",")): count
        for label, count in primary["scanned_free_forest_type_counts"].items()
    }
    cell_stats = {
        (row["N"], row["m"], row["r"]): {
            "matching_free_forest_types": 0,
            "raw_attachment_partition_representatives": 0,
            "coefficient_quotient_cases": 0,
            "positive": 0,
            "zero": 0,
            "negative": 0,
            "minimum_numerator": None,
            "minimum_signature": None,
        }
        for row in primary["rows"]
    }
    fingerprint = [0, 0, 0]
    scanned = {}
    matched = raw = quotient = 0
    needed_pairs = sorted({(m, components) for m, components, _ in targets})
    for m, component_count in reversed(needed_pairs):
        current_scan = 0
        for components in multiset_forests(records, m, component_count):
            current_scan += 1
            fjet = multiply_all(component.jet for component in components)
            cells = targets.get((m, component_count, fjet))
            if not cells:
                continue
            matched += 1
            raw_per_cell = (
                math.prod(len(component.deletion_jets) for component in components)
                * len(restricted_growth_strings(component_count))
            )
            states = quotient_states(components)
            for N, r in sorted(cells, reverse=True):
                stats = cell_stats[(N, m, r)]
                stats["matching_free_forest_types"] += 1
                stats["raw_attachment_partition_representatives"] += raw_per_cell
                raw += raw_per_cell
                for nonempty_roots, nonempty_jet in sorted(states, reverse=True):
                    djet = convolution(nonempty_jet, empty[r - nonempty_roots])
                    numerator = cleared_literal_numerator(terms, djet, fjet)
                    if numerator < 0:
                        stats["negative"] += 1
                    elif numerator == 0:
                        stats["zero"] += 1
                    else:
                        stats["positive"] += 1
                    stats["coefficient_quotient_cases"] += 1
                    if stats["minimum_numerator"] is None or numerator < stats["minimum_numerator"]:
                        stats["minimum_numerator"] = numerator
                        stats["minimum_signature"] = {
                            "forest_jet_f0_to_f6": list(fjet),
                            "nonempty_roots": nonempty_roots,
                            "nonempty_root_product_jet": list(nonempty_jet),
                            "D_jet_d0_to_d6": list(djet),
                        }
                    quotient += 1
                    fingerprint_add(
                        fingerprint,
                        [N, m, r, component_count, list(fjet), nonempty_roots,
                         list(nonempty_jet), list(djet), str(numerator)],
                    )
            if matched % 100 == 0:
                peak = max(peak, gate())
        scanned[(m, component_count)] = current_scan
        assert current_scan == expected_scan[(m, component_count)]
        peak = max(peak, gate())

    rows = []
    primary_rows = {(row["N"], row["m"], row["r"]): row for row in primary["rows"]}
    for cell in sorted(cell_stats):
        stats = cell_stats[cell]
        expected = primary_rows[cell]
        comparisons = {
            "matching_free_forest_types": "matching_forest_types",
            "raw_attachment_partition_representatives": "raw_attachment_partition_representatives",
            "coefficient_quotient_cases": "coefficient_quotient_cases",
            "positive": "positive",
            "zero": "zero",
            "negative": "negative",
        }
        for actual_name, expected_name in comparisons.items():
            assert stats[actual_name] == expected[expected_name], (cell, actual_name)
        assert str(stats["minimum_numerator"]) == expected["minimum_numerator"]
        rows.append({"N": cell[0], "m": cell[1], "r": cell[2], **stats})

    counts = primary["counts"]
    assert sum(scanned.values()) == counts["free_forest_types_scanned"]
    assert matched == counts["matching_free_forest_types"]
    assert raw == counts["raw_attachment_partition_representatives_covered"]
    assert quotient == counts["coefficient_quotient_cases"]
    assert sum(row["positive"] for row in rows) == counts["positive"]
    assert sum(row["zero"] for row in rows) == counts["zero"] == 0
    assert sum(row["negative"] for row in rows) == counts["negative"] == 0
    fingerprint_hex = {
        name: f"{value:064X}"
        for name, value in zip(("xor", "sum", "sum_squares"), fingerprint)
    }
    assert fingerprint_hex == primary["coefficient_quotient_multiset_fingerprint"]
    peak = max(peak, gate())

    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-small-m-2495-literal-attachment-independent-audit-v1",
        "status": "PASS_INDEPENDENT_GENG_BITMASK_DELETION_MASK3_SMALL_M_2495_LITERAL_REPLAY",
        "scope": primary["scope"],
        "method": (
            "Reverse nauty-geng tree enumeration, a shared-cache literal induced-subgraph "
            "deletion recurrence, global-index multiset forest generation, restricted-growth "
            "component partitions, and a separately transcribed literal gate numerator."
        ),
        "rows": rows,
        "counts": {
            "free_forest_types_scanned": sum(scanned.values()),
            "matching_free_forest_types": matched,
            "raw_attachment_partition_representatives_covered": raw,
            "coefficient_quotient_cases": quotient,
            "positive": sum(row["positive"] for row in rows),
            "zero": 0,
            "negative": 0,
        },
        "coefficient_quotient_multiset_fingerprint": fingerprint_hex,
        "geng_reverse_stream_sha256": geng_stream,
        "hashes": hashes,
        "resources": {
            "abort_private_bytes": ABORT_BYTES,
            "peak_private_bytes": peak,
            "peak_private_MiB": peak / 1024**2,
        },
        "proof_boundary": (
            "This independently audits only the 2,495 literal residual structures. "
            "A separate no-gap assembler must combine the coarse, joint-jet, envelope, "
            "and literal layers before the 224-cell wing or mask3 receives credit."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SCANNED", sum(scanned.values()), "MATCHED", matched)
    print("RAW", raw, "QUOTIENT", quotient, "NEGATIVE", 0)
    print("PEAK_MIB", payload["resources"]["peak_private_MiB"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
