#!/usr/bin/env python3
"""Exact distance proof of the strengthened connected J4/E5 coupling."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx

from prove_iso_n7_bundle_g1_sum0_signed_cluster_support_lemma_rank7_g4_piecewise import (
    support_mobius,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g1_connected_j4_e5_distance_coupling_exact_"
    "rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G1_CONNECTED_J4_E5_DISTANCE_COUPLING_"
    "RANK7_G4_PIECEWISE"
)
DEPENDENCIES = {
    "prove_iso_n7_bundle_g1_sum0_signed_cluster_support_lemma_rank7_g4_piecewise.py":
        "184CE9F5D92F49DED58C3EE477BEA916FC7C624F9E84A234AECD318CCAECF846",
    "iso_n7_bundle_g1_sum0_signed_cluster_support_lemma_exact_rank7_g4_piecewise_20260831.json":
        "180026E94A87369CA46D3F58F0ACB18EB35ED550792BB0F04BE5167B06D9ED3B",
}
TREE_COUNTS = {
    5: 3, 6: 6, 7: 11, 8: 23, 9: 47, 10: 106,
    11: 235, 12: 551, 13: 1301,
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def edge_distance(tree: nx.Graph, left, right) -> int:
    line = nx.line_graph(tree)
    return nx.shortest_path_length(line, left, right)


def counts(tree: nx.Graph):
    edges = tuple(tree.edges())
    line = nx.line_graph(tree)
    distances = dict(nx.all_pairs_shortest_path_length(line))
    j4 = p5 = long_pairs = 0
    for left, right in itertools.combinations(edges, 2):
        distance = distances[left][right]
        if distance >= 3:
            j4 += 1
            if distance == 3:
                p5 += 1
            else:
                long_pairs += 1

    p3k2 = 0
    for selected in itertools.combinations(edges, 3):
        induced = line.subgraph(selected)
        if sorted(dict(induced.degree()).values()) == [0, 1, 1]:
            p3k2 += 1
    return j4, p5, long_pairs, p3k2


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE / name) == digest, name

    # The two negative nonstar five-support types both have unit magnitude.
    negative_types = []
    for graph in nx.graph_atlas_g():
        if len(graph) != 5 or any(graph.degree(v) == 0 for v in graph):
            continue
        if nx.is_forest(graph) and support_mobius(graph) == -1:
            degrees = tuple(sorted(dict(graph.degree()).values(), reverse=True))
            if degrees != (4, 1, 1, 1, 1):
                components = tuple(sorted(
                    (len(component) for component in nx.connected_components(graph)),
                    reverse=True,
                ))
                negative_types.append((components, degrees))
    assert sorted(negative_types) == [
        ((3, 2), (2, 1, 1, 1, 1)),
        ((5,), (2, 2, 2, 1, 1)),
    ]

    stream = hashlib.sha256()
    audited_trees = 0
    minimum_gap = None
    equality_cases = 0
    for order, expected in TREE_COUNTS.items():
        trees = 0
        for index, tree in enumerate(nx.nonisomorphic_trees(order)):
            trees += 1
            audited_trees += 1
            j4, p5, long_pairs, p3k2 = counts(tree)
            assert j4 == p5 + long_pairs
            assert long_pairs <= p3k2
            l5 = p5 + p3k2
            gap = l5 - j4
            assert gap >= 0
            equality_cases += gap == 0
            minimum_gap = gap if minimum_gap is None else min(minimum_gap, gap)
            code = nx.to_graph6_bytes(tree, header=False).decode().strip()
            stream.update(
                f"{order}|{index}|{code}|{j4}|{p5}|{long_pairs}|{p3k2}|{gap}\n".encode()
            )
        assert trees == expected

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every connected tree W, if J4 is its induced-2K2 count "
            "and L5=-E5 is its negative nonstar five-support count, then "
            "L5>=J4."
        ),
        "proof": {
            "line_graph_partition": (
                "J4 is the number of pairs of edges at line-graph distance "
                "at least three. Distance-three pairs are in bijection "
                "with induced P5 supports."
            ),
            "long_pair_charge": (
                "Every pair at distance at least four has two incidences "
                "with an induced P3+K2 edge triple, using the first and "
                "last steps of its unique line-graph geodesic. Every "
                "P3+K2 triple contains at most two such long pairs. Hence "
                "the number of long pairs is at most the P3+K2 count."
            ),
            "support_identity": (
                "The pinned five-support classification gives "
                "L5=#P5+#(P3+K2), with unit weights. Therefore "
                "J4=#distance3+#long <= #P5+#(P3+K2)=L5."
            ),
        },
        "independent_finite_audit": {
            "orders": [5, 13],
            "tree_counts": TREE_COUNTS,
            "audited_trees": audited_trees,
            "minimum_L5_minus_J4": minimum_gap,
            "equality_cases": equality_cases,
            "ordered_stream_sha256": stream.hexdigest().upper(),
        },
        "coverage_gap_within_connected_tree_coupling": None,
        "scope": (
            "Universal connected-tree support coupling only. It strengthens "
            "the earlier J4/2 lower face but does not alone prove G1."
        ),
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "audited_trees": audited_trees,
        "minimum_L5_minus_J4": minimum_gap,
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "coverage_gap_within_connected_tree_coupling": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
