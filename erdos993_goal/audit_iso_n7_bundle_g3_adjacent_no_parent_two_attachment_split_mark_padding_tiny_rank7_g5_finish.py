#!/usr/bin/env python3
"""Exact tiny-base audits for split-mark two-attachment isolate padding."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_two_attachment_split_mark_padding_rank7_g5_finish import padding_coefficients


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_split_mark_padding_tiny_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_TWO_ATTACHMENT_SPLIT_MARK_PADDING_TINY_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def rows(graph: nx.Graph):
    h = graph.number_of_nodes()
    I = [0]*9
    Jx = [0]*8
    Jy = [0]*8
    for mask in range(1 << h):
        selected = [v for v in range(h) if mask & (1 << v)]
        if any(graph.has_edge(a, b) for a, b in itertools.combinations(selected, 2)):
            continue
        rank = len(selected)
        if rank <= 8:
            I[rank] += 1
        if rank <= 7 and 0 in selected:
            Jx[rank] += 1
        if rank <= 7 and 1 in selected:
            Jy[rank] += 1
    return I, Jx, Jy


def evaluator(expression, hsym, Ivars, Jxvars, Jyvars):
    variables = [hsym, *(Ivars[k] for k in range(2, 9)), *(Jxvars[k] for k in range(2, 8)), *(Jyvars[k] for k in range(2, 8))]
    terms = sp.Poly(expression, *variables).terms()
    def evaluate(values):
        total = 0
        for powers, coefficient in terms:
            assert coefficient.q == 1
            term = int(coefficient)
            for value, power in zip(values, powers):
                term *= value**power
            total += term
        return total
    return evaluate


def main() -> None:
    hsym, Ivars, Jxvars, Jyvars, coefficients = padding_coefficients()
    evaluators = {index: evaluator(coefficients[index], hsym, Ivars, Jxvars, Jyvars) for index in (1, 2)}
    stream = hashlib.sha256()
    order_reports = {}
    aggregate = negatives = 0
    global_minima = {1: None, 2: None}
    for h in range(2, 7):
        edges = list(itertools.combinations(range(h), 2))
        checked = 0
        local_min = {1: None, 2: None}
        witnesses = {1: None, 2: None}
        active_indices = (1, 2) if h == 2 else (1,)
        for edge_mask in range(1 << len(edges)):
            graph = nx.Graph()
            graph.add_nodes_from(range(h))
            graph.add_edges_from(edge for bit, edge in enumerate(edges) if edge_mask & (1 << bit))
            if not nx.is_forest(graph) or nx.has_path(graph, 0, 1):
                continue
            I, Jx, Jy = rows(graph)
            values = [h, *I[2:9], *Jx[2:8], *Jy[2:8]]
            encoding = tuple(sorted(graph.edges()))
            checked += 1
            for index in active_indices:
                value = evaluators[index](values)
                stream.update(f"H{index}|{h}|{encoding}|{I[2:9]}|{Jx[2:8]}|{Jy[2:8]}|{value};".encode())
                negatives += value < 0
                if local_min[index] is None or value < local_min[index]:
                    local_min[index] = value
                    witnesses[index] = {"edges": encoding, "I2_through_I8": I[2:9], "Jx2_through_Jx7": Jx[2:8], "Jy2_through_Jy7": Jy[2:8]}
        assert checked > 0
        for index in active_indices:
            assert local_min[index] is not None and local_min[index] >= 0
            global_minima[index] = local_min[index] if global_minima[index] is None else min(global_minima[index], local_min[index])
        order_reports[str(h)] = {"base_order_h": h, "labeled_forests_with_fixed_roots_in_distinct_components": checked, "indices_checked": list(active_indices), "minima": {str(i): local_min[i] for i in active_indices}, "minimum_witnesses": {str(i): witnesses[i] for i in active_indices}}
        aggregate += checked
    assert negatives == 0
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For split-mark roots in distinct components, H1 is nonnegative on every forest base 2<=h<=6, and H2 is nonnegative at h=2.",
        "method": "Complete labeled forest enumeration with ordered roots fixed as vertices 0,1.",
        "order_reports": order_reports,
        "aggregate": {"rooted_labeled_forests_checked": aggregate, "negative_count": negatives, "global_minimum_H1": global_minima[1], "global_minimum_H2_h2": global_minima[2], "ordered_stream_sha256": stream.hexdigest().upper()},
        "exact_coefficients": {"H1": str(coefficients[1]), "H2": str(coefficients[2])},
        "coverage_gap_within_tiny_padding_audit": None,
        "scope": "Split-mark two-attachment padding: H1 base h=2..6 and H2 base h=2 only.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, **report["aggregate"], "orders": [2, 6]}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
