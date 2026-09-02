#!/usr/bin/env python3
"""Literal attachment replay for the 14 remaining mask-3 joint jets."""

from __future__ import annotations

import ctypes
import hashlib
import itertools
import json
import math
from fractions import Fraction
from pathlib import Path

import networkx as nx

import prove_rank8_forest16_f5_f6_ratio_agent as forest
from analyze_rank8_delta0_new_leaf_mask3_selected_boundary_agent import base_polynomial


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_n26_r10_m16_c1_2_literal_attachment_exact_agent_20260823.json"
ABORT_BYTES = 424 * 1024**2
EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask3_n26_r10_m16_c1_2_joint_jet_agent.py":
        "2FD9E8F7740682D034C6214AA3CF2FAF06E3AC921068246DD3E94B60776F1A15",
    "rank8_delta0_new_leaf_mask3_n26_r10_m16_c1_2_joint_jet_exact_agent_20260823.json":
        "9DEEE1865A7538CA035D391D02721B0BB5CBBB7260C8383143A440740530736F",
    "audit_rank8_delta0_new_leaf_mask3_n26_r10_m16_c1_2_joint_jet_agent.py":
        "F672845D49F497A1758FE1659C103B000D5AB6C47B7E4BE748FC5050F2D124F1",
    "rank8_delta0_new_leaf_mask3_n26_r10_m16_c1_2_joint_jet_independent_audit_agent_20260823.json":
        "6F60AE3BB63BE2BD9050E469364E28AC158385506BD36E1D0CA592DC184EDAE7",
    "analyze_rank8_delta0_new_leaf_mask3_selected_boundary_agent.py":
        "817AD03F7B5DB8DDC1FF6D829F785A9255B89C8C36A0FB96A718549321FEDD8A",
    "prove_rank8_forest16_f5_f6_ratio_agent.py":
        "D2D9E23E930904B3C55EF5BB2B75D5CBB5D389A39B0A0F1AE7CA1B3A61BFDB21",
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


def shift(jet: tuple[int, ...]) -> tuple[int, ...]:
    return (0,) + jet[:6]


def isolate_jet(count: int) -> tuple[int, ...]:
    return tuple(math.comb(count, index) if index <= count else 0 for index in range(7))


def graph6(graph: nx.Graph) -> str:
    return nx.to_graph6_bytes(graph, header=False).strip().decode("ascii")


def deletion_forest_jet(tree: nx.Graph, vertex: int) -> tuple[int, ...]:
    remaining = tree.copy()
    remaining.remove_node(vertex)
    answer = (1, 0, 0, 0, 0, 0, 0)
    for vertices in nx.connected_components(remaining):
        component = remaining.subgraph(vertices).copy()
        current = (1, 1, 0, 0, 0, 0, 0) if len(component) == 1 else forest.tree_jet(component)
        answer = forest.multiply(answer, current)
    return answer


def gate_value(base_terms, djet: tuple[int, ...], fjet: tuple[int, ...]) -> Fraction:
    assert djet[6] > 0
    x = Fraction(djet[5], djet[6])
    y = Fraction(fjet[5], djet[6])
    z = Fraction(fjet[6], djet[6])
    value = Fraction(0)
    for (np, xp, yp, zp), coefficient in base_terms:
        assert np == 0
        value += int(coefficient) * x**xp * y**yp * z**zp
    return value


def update_digest(digest, label, fjet, djet, value):
    digest.update(str(label).encode())
    digest.update(b"|")
    digest.update(",".join(str(item) for item in fjet).encode())
    digest.update(b"|")
    digest.update(",".join(str(item) for item in djet).encode())
    digest.update(b"|")
    digest.update(f"{value.numerator}/{value.denominator}\n".encode())


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


def record_minimum(current, value: Fraction, witness: dict):
    if current is None or value < current[0]:
        return value, witness
    return current


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    prior = json.loads(
        (HERE / "rank8_delta0_new_leaf_mask3_n26_r10_m16_c1_2_joint_jet_exact_agent_20260823.json").read_text(
            encoding="utf-8"
        )
    )
    target = {1: set(), 2: set()}
    for row in prior["exact_obstructions"]:
        target[row["components"]].add(tuple(row["jet_f0_to_f6"]))
    assert {key: len(value) for key, value in target.items()} == {1: 7, 2: 7}

    peak = gate()
    trees: dict[int, list[tuple[str, nx.Graph, tuple[int, ...]]]] = {}
    tree_counts = []
    for order in range(1, 17):
        graphs = [nx.empty_graph(1)] if order == 1 else list(nx.nonisomorphic_trees(order))
        rows = [(graph6(graph), graph, (1, 1, 0, 0, 0, 0, 0) if order == 1 else forest.tree_jet(graph)) for graph in graphs]
        trees[order] = rows
        tree_counts.append(len(rows))
        peak = max(peak, gate())
    assert tree_counts == [1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1301, 3159, 7741, 19320]

    base_terms = base_polynomial().terms()
    digest = hashlib.sha256()
    invariant_cases = []
    route_counts = {
        "c1_forest_types": 0,
        "c1_attachment_vertices": 0,
        "c2_forest_types": 0,
        "c2_attachment_vertex_pairs": 0,
        "c2_same_root_cases": 0,
        "c2_distinct_root_cases": 0,
    }
    jet_type_counts = {1: {str(list(jet)): 0 for jet in sorted(target[1])}, 2: {str(list(jet)): 0 for jet in sorted(target[2])}}
    tested_values = 0
    negative = []
    minimum = None

    # If F is connected, exactly one of the ten roots has descendants.  Thus
    # D is nine isolates plus F with one new leaf at an arbitrary vertex.
    for code, tree, fjet in trees[16]:
        if fjet not in target[1]:
            continue
        route_counts["c1_forest_types"] += 1
        jet_type_counts[1][str(list(fjet))] += 1
        for vertex in sorted(tree):
            deleted = deletion_forest_jet(tree, vertex)
            extended = add(fjet, shift(deleted))
            djet = forest.multiply(isolate_jet(9), extended)
            value = gate_value(base_terms, djet, fjet)
            label = ("c1", code, vertex)
            update_digest(digest, label, fjet, djet, value)
            invariant_cases.append(("c1_one_nonisolated_root", fjet, djet, value))
            witness = {
                "route": "c1_one_nonisolated_root",
                "component_graph6": code,
                "attachment_vertex": vertex,
                "fjet": list(fjet),
                "djet": list(djet),
                "x_d5_over_d6": str(Fraction(djet[5], djet[6])),
                "y_f5_over_d6": str(Fraction(fjet[5], djet[6])),
                "z_f6_over_d6": str(Fraction(fjet[6], djet[6])),
            }
            minimum = record_minimum(minimum, value, witness)
            if value < 0:
                negative.append({**witness, "gate_numerator": str(value)})
            route_counts["c1_attachment_vertices"] += 1
            tested_values += 1

    # For two components of F, either they attach to two distinct roots
    # (eight other roots isolated) or to one common root (nine isolated).
    for left_order in range(1, 9):
        right_order = 16 - left_order
        left_rows = trees[left_order]
        right_rows = trees[right_order]
        pairs = itertools.product(left_rows, right_rows) if left_order < right_order else itertools.combinations_with_replacement(left_rows, 2)
        for (left_code, left_tree, left_jet), (right_code, right_tree, right_jet) in pairs:
            fjet = forest.multiply(left_jet, right_jet)
            if fjet not in target[2]:
                continue
            route_counts["c2_forest_types"] += 1
            jet_type_counts[2][str(list(fjet))] += 1
            left_deleted = {vertex: deletion_forest_jet(left_tree, vertex) for vertex in sorted(left_tree)}
            right_deleted = {vertex: deletion_forest_jet(right_tree, vertex) for vertex in sorted(right_tree)}
            for left_vertex, right_vertex in itertools.product(sorted(left_tree), sorted(right_tree)):
                delete_product = forest.multiply(left_deleted[left_vertex], right_deleted[right_vertex])

                same_component = add(fjet, shift(delete_product))
                same_djet = forest.multiply(isolate_jet(9), same_component)
                same_value = gate_value(base_terms, same_djet, fjet)
                same_label = ("c2_same", left_code, right_code, left_vertex, right_vertex)
                update_digest(digest, same_label, fjet, same_djet, same_value)
                invariant_cases.append(("c2_common_nonisolated_root", fjet, same_djet, same_value))
                same_witness = {
                    "route": "c2_common_nonisolated_root",
                    "component_graph6": [left_code, right_code],
                    "attachment_vertices": [left_vertex, right_vertex],
                    "fjet": list(fjet),
                    "djet": list(same_djet),
                    "x_d5_over_d6": str(Fraction(same_djet[5], same_djet[6])),
                    "y_f5_over_d6": str(Fraction(fjet[5], same_djet[6])),
                    "z_f6_over_d6": str(Fraction(fjet[6], same_djet[6])),
                }
                minimum = record_minimum(minimum, same_value, same_witness)
                if same_value < 0:
                    negative.append({**same_witness, "gate_numerator": str(same_value)})

                left_extended = add(left_jet, shift(left_deleted[left_vertex]))
                right_extended = add(right_jet, shift(right_deleted[right_vertex]))
                distinct_djet = forest.multiply(
                    isolate_jet(8), forest.multiply(left_extended, right_extended)
                )
                distinct_value = gate_value(base_terms, distinct_djet, fjet)
                distinct_label = ("c2_distinct", left_code, right_code, left_vertex, right_vertex)
                update_digest(digest, distinct_label, fjet, distinct_djet, distinct_value)
                invariant_cases.append(("c2_two_nonisolated_roots", fjet, distinct_djet, distinct_value))
                distinct_witness = {
                    "route": "c2_two_nonisolated_roots",
                    "component_graph6": [left_code, right_code],
                    "attachment_vertices": [left_vertex, right_vertex],
                    "fjet": list(fjet),
                    "djet": list(distinct_djet),
                    "x_d5_over_d6": str(Fraction(distinct_djet[5], distinct_djet[6])),
                    "y_f5_over_d6": str(Fraction(fjet[5], distinct_djet[6])),
                    "z_f6_over_d6": str(Fraction(fjet[6], distinct_djet[6])),
                }
                minimum = record_minimum(minimum, distinct_value, distinct_witness)
                if distinct_value < 0:
                    negative.append({**distinct_witness, "gate_numerator": str(distinct_value)})

                route_counts["c2_attachment_vertex_pairs"] += 1
                route_counts["c2_same_root_cases"] += 1
                route_counts["c2_distinct_root_cases"] += 1
                tested_values += 2
        peak = max(peak, gate())

    assert all(count > 0 for rows in jet_type_counts.values() for count in rows.values())
    assert tested_values == route_counts["c1_attachment_vertices"] + route_counts["c2_same_root_cases"] + route_counts["c2_distinct_root_cases"]
    assert minimum is not None
    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-n26-r10-m16-c1-2-literal-attachment-v1",
        "status": (
            "PASS_EXACT_MASK3_N26_R10_M16_C1_2_LITERAL_ATTACHMENT_CLOSURE"
            if not negative
            else "EXACT_LITERAL_ATTACHMENT_NEGATIVE_OPEN_NO_CLOSURE_CREDIT"
        ),
        "scope": (
            "Only the 14 realized coefficient jets obstructing Delta0/new-leaf/mask3 "
            "at (N,r,m)=(26,10,16), component counts c=1,2."
        ),
        "completeness": [
            "A-v has ten rooted tree components because deg_A(v)=10.",
            "If F=A-N[v] is connected, one root attaches to F and nine roots are isolated.",
            "If F has two components, they attach either to one common root plus nine isolates or to two distinct roots plus eight isolates.",
            "All free F types with the 14 target jets and every attachment vertex choice are enumerated.",
        ],
        "counts": {
            **route_counts,
            "literal_gate_values": tested_values,
            "negative_gate_values": len(negative),
        },
        "target_jet_forest_type_counts": jet_type_counts,
        "minimum_gate_numerator": str(minimum[0]),
        "minimum_witness": minimum[1],
        "negative_witnesses": negative,
        "literal_case_stream_sha256": digest.hexdigest().upper(),
        "isomorphism_invariant_case_multiset_sha256": invariant_case_sha256(invariant_cases),
        "hashes": hashes,
        "resources": {
            "abort_private_bytes": ABORT_BYTES,
            "peak_private_bytes": peak,
            "peak_private_MiB": peak / 1024**2,
        },
        "proof_boundary": (
            "A PASS closes only the c=1,2 structural routes for the final "
            "(26,10,16) cell, pending an independent geng/deletion audit and a "
            "five-cell assembler. It does not close finite mask3 or Problem 993."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("COUNTS", payload["counts"])
    print("MINIMUM", payload["minimum_gate_numerator"], payload["minimum_witness"])
    print("NEGATIVE", len(negative))
    print("PEAK_MIB", payload["resources"]["peak_private_MiB"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
