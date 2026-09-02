#!/usr/bin/env python3
"""Independent geng/literal-deletion replay of the final mask-3 cell."""

from __future__ import annotations

import ctypes
import functools
import hashlib
import itertools
import json
import subprocess
from fractions import Fraction
from pathlib import Path

import networkx as nx

from audit_rank8_delta0_new_leaf_mask3_quantitative_gap_tail_agent import literal_base


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_n26_r10_m16_c1_2_literal_attachment_independent_audit_agent_20260823.json"
GENG = HERE / "nauty2_8_9" / "geng.exe"
ABORT_BYTES = 424 * 1024**2
EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask3_n26_r10_m16_c1_2_literal_attachment_agent.py":
        "757EB1EDB26805A68C4260EF0F1470468F7F42E630627486BFA57DE32702251F",
    "rank8_delta0_new_leaf_mask3_n26_r10_m16_c1_2_literal_attachment_exact_agent_20260823.json":
        "4CEC3075CA99FA61DFD17E025B58345E979688B3384A602FB0289E9308533DFC",
    "audit_rank8_delta0_new_leaf_mask3_quantitative_gap_tail_agent.py":
        "A907744740C12E53A07E9710B8E2BBC1DC44B255D4107B5DBEB639FB4F3998A3",
    "rank8_delta0_new_leaf_mask3_n26_r10_m16_c1_2_joint_jet_independent_audit_agent_20260823.json":
        "6F60AE3BB63BE2BD9050E469364E28AC158385506BD36E1D0CA592DC184EDAE7",
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
    return tuple(
        sum(left[index] * right[total - index] for index in range(total + 1))
        for total in range(7)
    )


def shift(jet: tuple[int, ...]) -> tuple[int, ...]:
    return (0,) + jet[:6]


def independence_jet(graph: nx.Graph) -> tuple[int, ...]:
    """Literal deletion/closed-neighborhood recurrence on an arbitrary forest."""
    vertices = tuple(sorted(graph))
    position = {vertex: index for index, vertex in enumerate(vertices)}
    closed = [0] * len(vertices)
    for vertex in vertices:
        index = position[vertex]
        closed[index] = 1 << index
        for neighbor in graph[vertex]:
            closed[index] |= 1 << position[neighbor]

    @functools.lru_cache(maxsize=None)
    def recurse(mask: int) -> tuple[int, ...]:
        if mask == 0:
            return (1, 0, 0, 0, 0, 0, 0)
        bit = mask & -mask
        vertex = bit.bit_length() - 1
        excluded = recurse(mask ^ bit)
        smaller = recurse(mask & ~closed[vertex])
        return add(excluded, (0,) + smaller[:6])

    return recurse((1 << len(vertices)) - 1)


def vertex_deleted_jet(tree: nx.Graph, vertex: int) -> tuple[int, ...]:
    remaining = tree.copy()
    remaining.remove_node(vertex)
    return independence_jet(remaining)


def geng_codes(order: int) -> list[bytes]:
    edges = order - 1
    result = subprocess.run(
        [str(GENG), "-cq", str(order), f"{edges}:{edges}"],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    assert result.stderr == b"", result.stderr
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def gate_value(base_terms, djet: tuple[int, ...], fjet: tuple[int, ...]) -> Fraction:
    x = Fraction(djet[5], djet[6])
    y = Fraction(fjet[5], djet[6])
    z = Fraction(fjet[6], djet[6])
    value = Fraction(0)
    for (np, xp, yp, zp), coefficient in reversed(base_terms):
        assert np == 0
        value += int(coefficient) * x**xp * y**yp * z**zp
    return value


def invariant_case_sha256(rows) -> str:
    digest = hashlib.sha256()
    for route, fjet, djet, value in sorted(rows):
        digest.update(route.encode())
        digest.update(b"|")
        digest.update(",".join(str(item) for item in fjet).encode())
        digest.update(b"|")
        digest.update(",".join(str(item) for item in djet).encode())
        digest.update(b"|")
        digest.update(f"{value.numerator}/{value.denominator}\n".encode())
    return digest.hexdigest().upper()


def c1_d_graph(tree: nx.Graph, vertex: int) -> nx.Graph:
    answer = nx.convert_node_labels_to_integers(tree)
    root = len(answer)
    answer.add_edge(root, vertex)
    answer.add_nodes_from(range(root + 1, root + 10))
    assert len(answer) == 26 and nx.number_connected_components(answer) == 10
    return answer


def c2_d_graph(left: nx.Graph, right: nx.Graph, left_vertex: int, right_vertex: int, common: bool) -> nx.Graph:
    answer = nx.disjoint_union(left, right)
    right_offset = len(left)
    if common:
        root = len(answer)
        answer.add_edge(root, left_vertex)
        answer.add_edge(root, right_offset + right_vertex)
        answer.add_nodes_from(range(root + 1, root + 10))
    else:
        left_root = len(answer)
        right_root = left_root + 1
        answer.add_edge(left_root, left_vertex)
        answer.add_edge(right_root, right_offset + right_vertex)
        answer.add_nodes_from(range(right_root + 1, right_root + 9))
    assert len(answer) == 26 and nx.number_connected_components(answer) == 10
    return answer


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    primary = json.loads(
        (HERE / "rank8_delta0_new_leaf_mask3_n26_r10_m16_c1_2_literal_attachment_exact_agent_20260823.json").read_text(
            encoding="utf-8"
        )
    )
    joint = json.loads(
        (HERE / "rank8_delta0_new_leaf_mask3_n26_r10_m16_c1_2_joint_jet_exact_agent_20260823.json").read_text(
            encoding="utf-8"
        )
    )
    target = {1: set(), 2: set()}
    for row in joint["exact_obstructions"]:
        target[row["components"]].add(tuple(row["jet_f0_to_f6"]))
    assert {key: len(value) for key, value in target.items()} == {1: 7, 2: 7}

    peak = gate()
    tree_records: dict[int, list[tuple[bytes, tuple[int, ...]]]] = {}
    tree_counts = []
    geng_stream = hashlib.sha256()
    for order in range(1, 17):
        rows = []
        for code in reversed(geng_codes(order)):
            graph = nx.from_graph6_bytes(code)
            jet = independence_jet(graph)
            rows.append((code, jet))
            geng_stream.update(f"order={order};".encode())
            geng_stream.update(code)
            geng_stream.update(b"\n")
        tree_records[order] = rows
        tree_counts.append(len(rows))
        peak = max(peak, gate())
    assert tree_counts == [1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1301, 3159, 7741, 19320]

    base_terms = literal_base().terms()
    cases = []
    route_counts = {
        "c1_forest_types": 0,
        "c1_attachment_vertices": 0,
        "c2_forest_types": 0,
        "c2_attachment_vertex_pairs": 0,
        "c2_same_root_cases": 0,
        "c2_distinct_root_cases": 0,
    }
    jet_type_counts = {1: {str(list(jet)): 0 for jet in sorted(target[1])}, 2: {str(list(jet)): 0 for jet in sorted(target[2])}}
    minimum = None
    negatives = []
    literal_d_agreements = 0

    for code, fjet in reversed(tree_records[16]):
        if fjet not in target[1]:
            continue
        tree = nx.from_graph6_bytes(code)
        route_counts["c1_forest_types"] += 1
        jet_type_counts[1][str(list(fjet))] += 1
        for vertex in reversed(sorted(tree)):
            deleted = vertex_deleted_jet(tree, vertex)
            formula_djet = multiply((1, 9, 36, 84, 126, 126, 84), add(fjet, shift(deleted)))
            literal_djet = independence_jet(c1_d_graph(tree, vertex))
            assert literal_djet == formula_djet
            literal_d_agreements += 1
            value = gate_value(base_terms, literal_djet, fjet)
            cases.append(("c1_one_nonisolated_root", fjet, literal_djet, value))
            if minimum is None or value < minimum[0]:
                minimum = (value, fjet, literal_djet)
            if value < 0:
                negatives.append(("c1", fjet, literal_djet, value))
            route_counts["c1_attachment_vertices"] += 1

    for left_order in reversed(range(1, 9)):
        right_order = 16 - left_order
        left_rows = tree_records[left_order]
        right_rows = tree_records[right_order]
        pairs = itertools.product(left_rows, right_rows) if left_order < right_order else itertools.combinations_with_replacement(left_rows, 2)
        for (left_code, left_jet), (right_code, right_jet) in pairs:
            fjet = multiply(left_jet, right_jet)
            if fjet not in target[2]:
                continue
            left = nx.from_graph6_bytes(left_code)
            right = nx.from_graph6_bytes(right_code)
            route_counts["c2_forest_types"] += 1
            jet_type_counts[2][str(list(fjet))] += 1
            left_deleted = {vertex: vertex_deleted_jet(left, vertex) for vertex in sorted(left)}
            right_deleted = {vertex: vertex_deleted_jet(right, vertex) for vertex in sorted(right)}
            for left_vertex, right_vertex in reversed(list(itertools.product(sorted(left), sorted(right)))):
                deletion_product = multiply(left_deleted[left_vertex], right_deleted[right_vertex])

                same_formula = multiply((1, 9, 36, 84, 126, 126, 84), add(fjet, shift(deletion_product)))
                same_literal = independence_jet(c2_d_graph(left, right, left_vertex, right_vertex, True))
                assert same_literal == same_formula
                same_value = gate_value(base_terms, same_literal, fjet)
                cases.append(("c2_common_nonisolated_root", fjet, same_literal, same_value))
                literal_d_agreements += 1
                if minimum is None or same_value < minimum[0]:
                    minimum = (same_value, fjet, same_literal)
                if same_value < 0:
                    negatives.append(("c2_same", fjet, same_literal, same_value))

                left_extended = add(left_jet, shift(left_deleted[left_vertex]))
                right_extended = add(right_jet, shift(right_deleted[right_vertex]))
                distinct_formula = multiply((1, 8, 28, 56, 70, 56, 28), multiply(left_extended, right_extended))
                distinct_literal = independence_jet(c2_d_graph(left, right, left_vertex, right_vertex, False))
                assert distinct_literal == distinct_formula
                distinct_value = gate_value(base_terms, distinct_literal, fjet)
                cases.append(("c2_two_nonisolated_roots", fjet, distinct_literal, distinct_value))
                literal_d_agreements += 1
                if minimum is None or distinct_value < minimum[0]:
                    minimum = (distinct_value, fjet, distinct_literal)
                if distinct_value < 0:
                    negatives.append(("c2_distinct", fjet, distinct_literal, distinct_value))

                route_counts["c2_attachment_vertex_pairs"] += 1
                route_counts["c2_same_root_cases"] += 1
                route_counts["c2_distinct_root_cases"] += 1
        peak = max(peak, gate())

    assert not negatives
    assert route_counts == {key: primary["counts"][key] for key in route_counts}
    assert jet_type_counts == {int(key): value for key, value in primary["target_jet_forest_type_counts"].items()}
    assert len(cases) == primary["counts"]["literal_gate_values"] == 1146
    assert literal_d_agreements == len(cases)
    fingerprint = invariant_case_sha256(cases)
    assert fingerprint == primary["isomorphism_invariant_case_multiset_sha256"]
    assert str(minimum[0]) == primary["minimum_gate_numerator"]
    assert list(minimum[1]) == primary["minimum_witness"]["fjet"]
    assert list(minimum[2]) == primary["minimum_witness"]["djet"]

    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-n26-r10-m16-c1-2-literal-attachment-independent-audit-v1",
        "status": "PASS_INDEPENDENT_GENG_LITERAL_DELETION_MASK3_N26_R10_M16_C1_2_CLOSURE",
        "hashes": hashes,
        "method": (
            "nauty geng independently enumerated all free component trees; literal "
            "deletion/closed-neighborhood recurrence rebuilt every F and every order-26 "
            "D jet; direct literal mask-3 arithmetic replayed all attachment cases."
        ),
        "counts": {
            **route_counts,
            "literal_gate_values": len(cases),
            "literal_D_formula_agreements": literal_d_agreements,
            "negative_gate_values": 0,
        },
        "minimum_gate_numerator": str(minimum[0]),
        "minimum_fjet": list(minimum[1]),
        "minimum_djet": list(minimum[2]),
        "isomorphism_invariant_case_multiset_sha256": fingerprint,
        "geng_reverse_stream_sha256": geng_stream.hexdigest().upper(),
        "resources": {
            "abort_private_bytes": ABORT_BYTES,
            "peak_private_bytes": peak,
            "peak_private_MiB": peak / 1024**2,
        },
        "proof_boundary": (
            "This independently closes only the c=1,2 structural routes for the "
            "last (26,10,16) cell. A five-cell/middle assembler and its audit are "
            "still required before broader mask3 credit."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("COUNTS", payload["counts"])
    print("MINIMUM", payload["minimum_gate_numerator"])
    print("PEAK_MIB", payload["resources"]["peak_private_MiB"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
