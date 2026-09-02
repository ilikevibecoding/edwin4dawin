#!/usr/bin/env python3
"""Exact h=7 seam for the split p0_q2 mixed-isolated pattern."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from prove_iso_n7_bundle_g3_sum0_ordinary_nonisolated_finite_n11_14_rank7_g5_finish import (
    TREE_COUNTS,
    component_types,
    expected_forest_count,
    forest_component_multisets,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_split_p0q2_finite_h7_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_THREE_ATTACHMENT_SPLIT_P0Q2_FINITE_H7_RANK7_G5_FINISH"
FILES = {
    "derive_source": "derive_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_isolated_patterns_rank7_g5_finish.py",
    "derive_report": "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_isolated_patterns_exact_rank7_g5_finish_20260831.json",
    "enumerator_source": "prove_iso_n7_bundle_g3_sum0_ordinary_nonisolated_finite_n11_14_rank7_g5_finish.py",
}
EXPECTED = {
    "derive_source": "9D46FCE74417CBDCAD1A26A0294F553ED8F1E7B07FB6F79106CBD0D105C9CF08",
    "derive_report": "9BCB510FBD8C450A50B6905962E2464CF7B805887D0E3F0225A686EDF729E52F",
    "enumerator_source": "2CB2144CD9940AA725A26619B0B1EEA615ED11A07D02F165205D16AB23789271",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def rows_and_rooted(graph: nx.Graph):
    h = graph.number_of_nodes()
    neighbor_masks = [0]*h
    for u, v in graph.edges():
        neighbor_masks[u] |= 1 << v
        neighbor_masks[v] |= 1 << u
    independent = bytearray(1 << h)
    independent[0] = 1
    A = [0]*9
    rooted = [[0]*8 for _ in range(h)]
    for mask in range(1 << h):
        if mask:
            bit = mask & -mask
            vertex = bit.bit_length()-1
            rest = mask ^ bit
            independent[mask] = independent[rest] and not (neighbor_masks[vertex] & rest)
        if not independent[mask]:
            continue
        rank = mask.bit_count()
        if rank <= 8:
            A[rank] += 1
        if rank <= 7:
            for vertex in range(h):
                if mask & (1 << vertex):
                    rooted[vertex][rank] += 1
    return A, rooted


def evaluator():
    branch = json.loads((HERE / FILES["derive_report"]).read_text(encoding="utf-8"))["split_mark_2plus1"]["p0_q2"]
    h = sp.Symbol("h")
    A = {k: sp.Symbol(f"A{k}") for k in range(2, 9)}
    R = {k: sp.Symbol(f"R{k}") for k in range(2, 8)}
    exact = sp.expand(sp.sympify(branch["identity_in_H_rows"], locals={"h": h, **{f"A{k}": A[k] for k in A}, **{f"R{k}": R[k] for k in R}}))
    variables = [h, *(A[k] for k in range(2, 9)), *(R[k] for k in range(2, 8))]
    terms = sp.Poly(exact, *variables).terms()
    def evaluate(values):
        total = 0
        for powers, coefficient in terms:
            assert coefficient.q == 1
            term = int(coefficient)
            for value, power in zip(values, powers):
                term *= value**power
            total += term
        return total
    return exact, evaluate


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE / FILES[key]) == digest, key
    assert nx.__version__ == "3.6.1"
    exact, evaluate = evaluator()
    h = 7
    types = component_types(h)
    forests = roots = negatives = 0
    minimum = None
    witness = None
    stream = hashlib.sha256()
    for component_ids in forest_component_multisets(h, types):
        graph = nx.disjoint_union_all([types[index][2] for index in component_ids])
        assert graph.number_of_nodes() == h and nx.is_forest(graph) and all(degree >= 1 for _, degree in graph.degree())
        forests += 1
        A, rooted = rows_and_rooted(graph)
        encoding = tuple((types[index][0], types[index][1]) for index in component_ids)
        for root in range(h):
            value = evaluate([h, *A[2:9], *rooted[root][2:8]])
            stream.update(f"{encoding}|{root}|{A[2:9]}|{rooted[root][2:8]}|{value};".encode())
            roots += 1
            negatives += value < 0
            if minimum is None or value < minimum:
                minimum = value
                witness = {"component_types_size_and_index": encoding, "root": root, "A2_through_A8": A[2:9], "R2_through_R7": rooted[root][2:8]}
    assert forests == expected_forest_count(h)
    assert roots > 0 and negatives == 0 and minimum is not None and minimum >= 0
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For split 2+1 exactly-three adjacent no-parent attachments with both Q roots isolated, the P root nonisolated, isolate-free H of order h=7, and total order n=11, G3>=0.",
        "method": "Complete unlabeled isolate-free forest generation, every surviving P root, and literal independent-set enumeration.",
        "counts": {"unlabeled_isolate_free_forests": forests, "rooted_instances_including_automorphic_duplicates": roots, "negative_count": negatives, "minimum_G3": str(minimum), "minimum_witness": witness, "ordered_row_stream_sha256": stream.hexdigest().upper()},
        "exact_expression": str(exact),
        "coverage_gap_within_p0q2_h7": None,
        "scope": "Split p0_q2 exactly-three attachment pattern, isolate-free H, h=7/n=11 only.",
        "dependencies_sha256": EXPECTED,
        "environment": {"networkx_version": nx.__version__, "tree_counts": TREE_COUNTS},
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, **report["counts"], "total_order_n": 11}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
