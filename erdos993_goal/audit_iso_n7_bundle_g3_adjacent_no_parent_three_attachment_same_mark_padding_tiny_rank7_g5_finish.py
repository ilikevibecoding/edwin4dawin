#!/usr/bin/env python3
"""Exact tiny-base H1 audit for same-mark three-attachment isolate padding."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_three_attachment_same_mark_padding_rank7_g5_finish import padding_coefficients


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_three_attachment_same_mark_padding_tiny_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_THREE_ATTACHMENT_SAME_MARK_PADDING_TINY_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def rows(graph: nx.Graph, roots: tuple[int, int, int]):
    h = graph.number_of_nodes()
    root_set = set(roots)
    independent = [0] * 9
    rooted_union = [0] * 8
    for mask in range(1 << h):
        selected = [v for v in range(h) if mask & (1 << v)]
        if any(graph.has_edge(a, b) for a, b in itertools.combinations(selected, 2)):
            continue
        rank = len(selected)
        if rank <= 8:
            independent[rank] += 1
        if rank <= 7 and root_set.intersection(selected):
            rooted_union[rank] += 1
    return independent, rooted_union


def main() -> None:
    hsym, ivars, jvars, coefficients = padding_coefficients()
    expression = coefficients[1]
    variables = [hsym, *(ivars[k] for k in range(2, 9)), *(jvars[k] for k in range(2, 8))]
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

    atlas = nx.graph_atlas_g()
    stream = hashlib.sha256()
    order_reports = {}
    aggregate = 0
    global_minimum = None
    for h in range(3, 8):
        checked = negatives = 0
        local_minimum = None
        witness = None
        forests = [graph for graph in atlas if graph.number_of_nodes() == h and nx.is_forest(graph)]
        for graph_index, graph in enumerate(forests):
            components = {vertex: index for index, component in enumerate(nx.connected_components(graph)) for vertex in component}
            for roots in itertools.combinations(range(h), 3):
                if len({components[root] for root in roots}) != 3:
                    continue
                independent, rooted_union = rows(graph, roots)
                assert rooted_union[1] == 3
                values = [h, *independent[2:9], *rooted_union[2:8]]
                value = evaluate(values)
                encoding = tuple(sorted(tuple(sorted(edge)) for edge in graph.edges()))
                stream.update(f"{h}|{graph_index}|{encoding}|{roots}|{independent[2:9]}|{rooted_union[2:8]}|{value};".encode())
                checked += 1
                negatives += value < 0
                if local_minimum is None or value < local_minimum:
                    local_minimum = value
                    witness = {
                        "atlas_forest_index_within_order": graph_index,
                        "edges": encoding,
                        "roots": roots,
                        "I2_through_I8": independent[2:9],
                        "Q2_through_Q7": rooted_union[2:8],
                    }
        assert checked > 0 and negatives == 0 and local_minimum is not None and local_minimum >= 0
        order_reports[str(h)] = {
            "base_order_h": h,
            "unlabeled_forests": len(forests),
            "root_sets_in_three_distinct_components_including_automorphic_duplicates": checked,
            "negative_count": negatives,
            "minimum_H1": local_minimum,
            "minimum_witness": witness,
        }
        aggregate += checked
        global_minimum = local_minimum if global_minimum is None else min(global_minimum, local_minimum)

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For every forest base of order 3<=h<=7 and fixed three-root set in three distinct components, the first isolate-padding Newton coefficient H1 is nonnegative.",
        "method": "Complete graph-atlas enumeration of every unlabeled forest through order 7 and every three-root set; automorphic duplicates are retained.",
        "order_reports": order_reports,
        "aggregate": {
            "rooted_unlabeled_forest_instances_checked": aggregate,
            "negative_count": 0,
            "global_minimum_H1": global_minimum,
            "ordered_stream_sha256": stream.hexdigest().upper(),
        },
        "exact_H1": str(expression),
        "coverage_gap_within_tiny_H1": None,
        "scope": "Same-mark exactly-three-attachment isolate-padding H1 for base orders h=3..7 only.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, **report["aggregate"], "orders": [3, 7]}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
