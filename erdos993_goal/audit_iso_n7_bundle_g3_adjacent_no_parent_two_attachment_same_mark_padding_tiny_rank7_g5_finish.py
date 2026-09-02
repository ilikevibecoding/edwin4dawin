#!/usr/bin/env python3
"""Exact tiny-base H1 audit for same-mark two-attachment isolate padding."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_padding_rank7_g5_finish import padding_coefficients


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_two_attachment_same_mark_padding_tiny_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_TWO_ATTACHMENT_SAME_MARK_PADDING_TINY_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def rows(graph: nx.Graph):
    h = graph.number_of_nodes()
    I = [0]*9
    J = [0]*8
    for mask in range(1 << h):
        selected = [v for v in range(h) if mask & (1 << v)]
        if any(graph.has_edge(a, b) for a, b in itertools.combinations(selected, 2)):
            continue
        rank = len(selected)
        if rank <= 8:
            I[rank] += 1
        if rank <= 7 and (0 in selected or 1 in selected):
            J[rank] += 1
    return I, J


def main() -> None:
    hsym, Ivars, Jvars, coefficients = padding_coefficients()
    expression = coefficients[1]
    variables = [hsym, *(Ivars[k] for k in range(2, 9)), *(Jvars[k] for k in range(2, 8))]
    polynomial = sp.Poly(expression, *variables)
    terms = polynomial.terms()

    def evaluate(values):
        total = 0
        for powers, coefficient in terms:
            assert coefficient.q == 1
            term = int(coefficient)
            for value, power in zip(values, powers):
                term *= value**power
            total += term
        return total

    stream = hashlib.sha256()
    order_reports = {}
    aggregate = 0
    global_minimum = None
    for h in range(2, 6):
        edges = list(itertools.combinations(range(h), 2))
        checked = negatives = 0
        local_minimum = None
        witness = None
        for edge_mask in range(1 << len(edges)):
            graph = nx.Graph()
            graph.add_nodes_from(range(h))
            graph.add_edges_from(edge for bit, edge in enumerate(edges) if edge_mask & (1 << bit))
            if not nx.is_forest(graph) or nx.has_path(graph, 0, 1):
                continue
            I, J = rows(graph)
            assert J[1] == 2
            values = [h, *I[2:9], *J[2:8]]
            value = evaluate(values)
            encoding = tuple(sorted(graph.edges()))
            stream.update(f"{h}|{encoding}|{I[2:9]}|{J[2:8]}|{value};".encode())
            checked += 1
            negatives += value < 0
            if local_minimum is None or value < local_minimum:
                local_minimum = value
                witness = {"edges": encoding, "I2_through_I8": I[2:9], "Q2_through_Q7": J[2:8]}
        assert checked > 0 and negatives == 0 and local_minimum is not None and local_minimum >= 0
        order_reports[str(h)] = {"base_order_h": h, "labeled_forests_with_fixed_roots_in_distinct_components": checked, "negative_count": negatives, "minimum_H1": local_minimum, "minimum_witness": witness}
        aggregate += checked
        global_minimum = local_minimum if global_minimum is None else min(global_minimum, local_minimum)

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For every forest base of order 2<=h<=5 and fixed attachment roots x,y in distinct components, the first isolate-padding Newton coefficient H1 is nonnegative.",
        "method": "Complete labeled graph enumeration with roots fixed as vertices 0,1; this exhausts every rooted isomorphism type.",
        "order_reports": order_reports,
        "aggregate": {"rooted_labeled_forests_checked": aggregate, "negative_count": 0, "global_minimum_H1": global_minimum, "ordered_stream_sha256": stream.hexdigest().upper()},
        "exact_H1": str(expression),
        "coverage_gap_within_tiny_H1": None,
        "scope": "Same-mark two-attachment isolate-padding H1 for base orders h=2..5 only.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, **report["aggregate"], "orders": [2, 5]}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
