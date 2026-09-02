#!/usr/bin/env python3
"""Exact n=11 seam for split-mark two nonisolated adjacent attachments."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from prove_iso_n7_bundle_g3_sum0_ordinary_nonisolated_finite_n11_14_rank7_g5_finish import component_types, expected_forest_count, forest_component_multisets


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_split_mark_both_nonisolated_finite_n11_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_TWO_ATTACHMENT_SPLIT_MARK_BOTH_NONISOLATED_FINITE_N11_RANK7_G5_FINISH"
FILES = {
    "derive_source": "derive_iso_n7_bundle_g3_adjacent_no_parent_two_attachment_roots_rank7_g5_finish.py",
    "derive_report": "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_roots_exact_rank7_g5_finish_20260831.json",
    "enumerator_source": "prove_iso_n7_bundle_g3_sum0_ordinary_nonisolated_finite_n11_14_rank7_g5_finish.py",
}
EXPECTED = {
    "derive_source": "AB5B8B1C5A3A9792C0656A390A5018D154F5C220B5233992AE6D239CA8C0283D",
    "derive_report": "46B51E942EB3E86CB2B1F39A6E90BE0B5E67E5E40EF9989337825E65B59B1C6D",
    "enumerator_source": "2CB2144CD9940AA725A26619B0B1EEA615ED11A07D02F165205D16AB23789271",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def rows_and_masks(graph: nx.Graph):
    m = graph.number_of_nodes()
    neighbor_masks = [0]*m
    for u, v in graph.edges():
        neighbor_masks[u] |= 1 << v
        neighbor_masks[v] |= 1 << u
    independent = bytearray(1 << m)
    independent[0] = 1
    W = [0]*9
    masks_by_rank = [[] for _ in range(8)]
    for mask in range(1 << m):
        if mask:
            bit = mask & -mask
            vertex = bit.bit_length()-1
            rest = mask ^ bit
            independent[mask] = independent[rest] and not (neighbor_masks[vertex] & rest)
        if independent[mask]:
            rank = mask.bit_count()
            if rank <= 8:
                W[rank] += 1
            if rank <= 7:
                masks_by_rank[rank].append(mask)
    return W, masks_by_rank


def evaluator():
    split = json.loads((HERE / FILES["derive_report"]).read_text(encoding="utf-8"))["split_mark"]
    m = sp.Symbol("m", positive=True)
    W = {k: sp.Symbol(f"W{k}", nonnegative=True) for k in range(2, 9)}
    Rx = {k: sp.Symbol(f"Rx{k}", nonnegative=True) for k in range(2, 8)}
    Ry = {k: sp.Symbol(f"Ry{k}", nonnegative=True) for k in range(2, 8)}
    exact = sp.expand(sp.sympify(split["identity"], locals={"m": m, **{f"W{k}": W[k] for k in W}, **{f"Rx{k}": Rx[k] for k in Rx}, **{f"Ry{k}": Ry[k] for k in Ry}}))
    variables = [m, *(W[k] for k in range(2, 9)), *(Rx[k] for k in range(2, 8)), *(Ry[k] for k in range(2, 8))]
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
    m = 9
    types = component_types(m)
    stream = hashlib.sha256()
    forests = ordered_root_pairs = negatives = 0
    minimum = None
    witness = None
    for component_ids in forest_component_multisets(m, types):
        graph = nx.disjoint_union_all([types[index][2] for index in component_ids])
        assert graph.number_of_nodes() == m and nx.is_forest(graph) and all(d >= 1 for _, d in graph.degree())
        forests += 1
        W, masks_by_rank = rows_and_masks(graph)
        component_index = {}
        for index, component in enumerate(nx.connected_components(graph)):
            for vertex in component:
                component_index[vertex] = index
        encoding = tuple((types[index][0], types[index][1]) for index in component_ids)
        for x in range(m):
            for y in range(m):
                if x == y or component_index[x] == component_index[y]:
                    continue
                Rx = [0]*8
                Ry = [0]*8
                for rank in range(2, 8):
                    Rx[rank] = sum(bool(mask & (1 << x)) for mask in masks_by_rank[rank])
                    Ry[rank] = sum(bool(mask & (1 << y)) for mask in masks_by_rank[rank])
                value = evaluate([m, *W[2:9], *Rx[2:8], *Ry[2:8]])
                stream.update(f"{encoding}|{x}>{y}|{W[2:9]}|{Rx[2:8]}|{Ry[2:8]}|{value};".encode())
                ordered_root_pairs += 1
                negatives += value < 0
                if minimum is None or value < minimum:
                    minimum = value
                    witness = {"component_types_size_and_index": encoding, "x_root": x, "y_root": y, "W2_through_W8": W[2:9], "Rx2_through_Rx7": Rx[2:8], "Ry2_through_Ry7": Ry[2:8]}
    assert forests == expected_forest_count(m)
    assert ordered_root_pairs > 0 and negatives == 0 and minimum is not None and minimum >= 0
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For every isolate-free W of order m=9 and every ordered pair of roots in distinct components, adjacent no-parent split-mark exactly-two-attachment G3 is nonnegative (n=11).",
        "method": "Complete unlabeled isolate-free forest generation, every ordered cross-component root pair, and literal independent-set enumeration preserving all bilinear terms.",
        "counts": {"unlabeled_isolate_free_forests": forests, "ordered_cross_component_root_pairs_including_automorphic_duplicates": ordered_root_pairs, "negative_count": negatives, "minimum_G3": str(minimum), "minimum_witness": witness, "ordered_row_stream_sha256": stream.hexdigest().upper()},
        "exact_expression": str(exact),
        "coverage_gap_within_split_mark_both_nonisolated_n11": None,
        "scope": "Split-mark two attachments, both roots nonisolated, isolate-free W, n=11 only.",
        "dependencies_sha256": EXPECTED,
        "environment": {"networkx_version": nx.__version__},
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, **report["counts"], "total_order_n": 11}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
