#!/usr/bin/env python3
"""Exact componentwise classifier of isolate-free six-edge forest cores."""

from __future__ import annotations

import hashlib
import itertools
import json
from collections import Counter
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g3_adjacent_no_parent_six_edge_core_"
    "classifier_exact_rank7_g5_finish_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_"
    "SIX_EDGE_CORE_CLASSIFIER_RANK7_G5_FINISH"
)
EXPECTED_TREE_COUNTS = {1: 1, 2: 1, 3: 2, 4: 3, 5: 6, 6: 11}
EXPECTED_PARTITION_COUNTS = {
    (6,): 11,
    (5, 1): 6,
    (4, 2): 3,
    (4, 1, 1): 3,
    (3, 3): 3,
    (3, 2, 1): 2,
    (3, 1, 1, 1): 2,
    (2, 2, 2): 1,
    (2, 2, 1, 1): 1,
    (2, 1, 1, 1, 1): 1,
    (1, 1, 1, 1, 1, 1): 1,
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def canonical_tree_edges(graph: nx.Graph) -> tuple[tuple[int, int], ...]:
    vertices = tuple(sorted(graph.nodes()))
    best = None
    for image in itertools.permutations(range(len(vertices))):
        relabel = dict(zip(vertices, image))
        encoding = tuple(
            sorted(
                tuple(sorted((relabel[left], relabel[right])))
                for left, right in graph.edges()
            )
        )
        if best is None or encoding < best:
            best = encoding
    assert best is not None
    return best


def exact_unlabeled_trees(edge_count: int) -> list[nx.Graph]:
    order = edge_count + 1
    representatives: list[nx.Graph] = []
    for sequence in itertools.product(range(order), repeat=max(0, order - 2)):
        graph = nx.from_prufer_sequence(sequence)
        if any(nx.is_isomorphic(graph, representative) for representative in representatives):
            continue
        representatives.append(graph)
    representatives.sort(key=canonical_tree_edges)
    assert len(representatives) == EXPECTED_TREE_COUNTS[edge_count]
    return representatives


def integer_partitions(total: int, maximum: int | None = None):
    if total == 0:
        yield ()
        return
    upper = min(total, maximum if maximum is not None else total)
    for first in range(upper, 0, -1):
        for tail in integer_partitions(total - first, first):
            yield (first,) + tail


def component_multisets(
    partition: tuple[int, ...], tree_types: dict[int, list[nx.Graph]]
):
    grouped = []
    counter_items = sorted(Counter(partition).items(), reverse=True)
    for edge_count, multiplicity in counter_items:
        grouped.append(
            tuple(
                itertools.combinations_with_replacement(
                    range(len(tree_types[edge_count])), multiplicity
                )
            )
        )
    for choices in itertools.product(*grouped):
        components = []
        for (edge_count, _multiplicity), type_indices in zip(counter_items, choices):
            components.extend((edge_count, type_index) for type_index in type_indices)
        yield tuple(components)


def main() -> None:
    tree_types = {
        edge_count: exact_unlabeled_trees(edge_count)
        for edge_count in range(1, 7)
    }
    records = []
    partition_counts = {}
    graphs = []
    for partition in integer_partitions(6):
        count = 0
        for components in component_multisets(partition, tree_types):
            graph = nx.disjoint_union_all(
                [
                    tree_types[edge_count][type_index]
                    for edge_count, type_index in components
                ]
            )
            assert graph.number_of_edges() == 6
            assert all(graph.degree(vertex) > 0 for vertex in graph)
            assert nx.is_forest(graph)
            descriptor = tuple(
                (
                    edge_count,
                    canonical_tree_edges(tree_types[edge_count][type_index]),
                )
                for edge_count, type_index in components
            )
            records.append(
                {
                    "core_index": len(records),
                    "component_edge_partition": partition,
                    "component_type_descriptor": descriptor,
                    "order": graph.number_of_nodes(),
                    "components": nx.number_connected_components(graph),
                    "degree_sequence": sorted(
                        (degree for _vertex, degree in graph.degree()), reverse=True
                    ),
                    "representative_edges": tuple(
                        sorted(tuple(sorted(edge)) for edge in graph.edges())
                    ),
                }
            )
            graphs.append(graph)
            count += 1
        partition_counts[partition] = count
    assert partition_counts == EXPECTED_PARTITION_COUNTS
    assert len(records) == 34
    assert all(
        not nx.is_isomorphic(graphs[left], graphs[right])
        for left in range(len(graphs))
        for right in range(left + 1, len(graphs))
    )
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "method": (
            "Enumerate every Prüfer sequence through seven vertices to obtain "
            "the exact unlabeled tree component types, then take every multiset "
            "of components over every integer partition of six edges."
        ),
        "order_range_guard": (
            "An isolate-free six-edge forest has c=m-6 components, each of "
            "order at least two, so 7<=m<=12."
        ),
        "unlabeled_tree_counts_by_component_edges": EXPECTED_TREE_COUNTS,
        "core_counts_by_component_edge_partition": {
            "+".join(map(str, partition)): count
            for partition, count in partition_counts.items()
        },
        "exact_isomorphism_class_count": len(records),
        "isomorphism_classes": records,
        "coverage_gap_within_six_edge_core_classifier": None,
        "scope_guard": (
            "This classifies e(W)=6 isolate-free cores only; it is not a G3 "
            "positivity certificate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(
        json.dumps(
            {
                "marker": MARKER,
                "tree_counts": EXPECTED_TREE_COUNTS,
                "partition_counts": {
                    "+".join(map(str, partition)): count
                    for partition, count in partition_counts.items()
                },
                "exact_isomorphism_class_count": len(records),
                "coverage_gap": None,
            },
            indent=2,
            sort_keys=True,
        )
    )
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
