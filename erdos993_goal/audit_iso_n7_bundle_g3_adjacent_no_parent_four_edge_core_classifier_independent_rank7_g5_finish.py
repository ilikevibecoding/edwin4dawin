#!/usr/bin/env python3
"""Independent exhaustive audit of the isolate-free four-edge forest cores."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_four_edge_core_classifier_independent_audit_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FOUR_EDGE_CORE_CLASSIFIER_INDEPENDENT_AUDIT_RANK7_G5_FINISH"
SHARD_SOURCE = HERE / "prove_iso_n7_bundle_g3_adjacent_no_parent_ge6_four_edges_core_shard_rank7_g5_finish.py"
SHARD_SOURCE_SHA = "6B26B69B2ED5589B5845FAACA3E29AE3A89990B55640FC1F977DEEA274BB01FE"
EXPECTED_ENCODINGS = (
    ((0, 1), (0, 2), (0, 3), (0, 4)),
    ((0, 1), (0, 2), (0, 3), (1, 4)),
    ((0, 1), (0, 2), (1, 3), (2, 4)),
    ((0, 1), (0, 2), (0, 3), (4, 5)),
    ((0, 1), (0, 2), (1, 3), (4, 5)),
    ((0, 1), (0, 2), (3, 4), (3, 5)),
    ((0, 1), (0, 2), (3, 4), (5, 6)),
    ((0, 1), (2, 3), (4, 5), (6, 7)),
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def canonical_edges(graph: nx.Graph) -> tuple[tuple[int, int], ...]:
    vertices = tuple(sorted(graph.nodes()))
    best = None
    for image in itertools.permutations(range(len(vertices))):
        relabel = dict(zip(vertices, image))
        encoding = tuple(sorted(
            tuple(sorted((relabel[left], relabel[right])))
            for left, right in graph.edges()
        ))
        if best is None or encoding < best:
            best = encoding
    assert best is not None
    return best


def add_isomorphism_class(classes: list[dict], graph: nx.Graph) -> None:
    for record in classes:
        if nx.is_isomorphic(graph, record["representative"]):
            record["labeled_witnesses"] += 1
            return
    classes.append({"representative": graph.copy(), "labeled_witnesses": 1})


def main() -> None:
    assert sha256(SHARD_SOURCE) == SHARD_SOURCE_SHA
    classes = []
    candidate_counts = {}
    forest_counts = {}
    for order in range(5, 9):
        possible_edges = tuple(itertools.combinations(range(order), 2))
        candidate_counts[str(order)] = 0
        forest_counts[str(order)] = 0
        for chosen_edges in itertools.combinations(possible_edges, 4):
            candidate_counts[str(order)] += 1
            graph = nx.Graph()
            graph.add_nodes_from(range(order))
            graph.add_edges_from(chosen_edges)
            if any(graph.degree(vertex) == 0 for vertex in graph):
                continue
            if not nx.is_forest(graph):
                continue
            forest_counts[str(order)] += 1
            add_isomorphism_class(classes, graph)
    encodings = sorted(
        (record["representative"].number_of_nodes(), canonical_edges(record["representative"]), record)
        for record in classes
    )
    assert len(encodings) == 8
    assert tuple(encoding for _order, encoding, _record in encodings) == EXPECTED_ENCODINGS
    assert all(
        not nx.is_isomorphic(left[2]["representative"], right[2]["representative"])
        for index, left in enumerate(encodings)
        for right in encodings[index + 1:]
    )
    class_records = []
    for core_index, (order, encoding, record) in enumerate(encodings):
        graph = record["representative"]
        class_records.append({
            "core_index": core_index,
            "order": order,
            "canonical_edges": encoding,
            "degree_sequence": sorted((degree for _vertex, degree in graph.degree()), reverse=True),
            "component_orders": sorted((len(component) for component in nx.connected_components(graph)), reverse=True),
            "labeled_witnesses": record["labeled_witnesses"],
        })
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "method": "Enumerate every four-edge labeled simple graph on orders 5 through 8, reject isolates and cycles, and deduplicate the survivors by exact graph isomorphism.",
        "order_range_guard": "An isolate-free four-edge forest has c=m-4 components, each of order at least two, so 5<=m<=8; no other orders are possible.",
        "candidate_graph_counts": candidate_counts,
        "isolate_free_forest_witness_counts": forest_counts,
        "isomorphism_classes": class_records,
        "exact_isomorphism_class_count": len(class_records),
        "matches_producer_core_order": True,
        "coverage_gap_within_four_edge_core_classifier": None,
        "dependencies_sha256": {SHARD_SOURCE.name: SHARD_SOURCE_SHA},
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "candidate_graphs": sum(candidate_counts.values()),
        "isolate_free_forest_witnesses": sum(forest_counts.values()),
        "exact_isomorphism_class_count": len(class_records),
        "coverage_gap": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
