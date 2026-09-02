#!/usr/bin/env python3
"""Independent graph-level audit of the lifted nonadjacent cross-edge bounds."""

from __future__ import annotations

from math import comb
import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx

from audit_rank8_forest_root_deletion_attachment_floor_root import (
    nonisomorphic_forests,
    tree_catalog,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_mark_cross_edge_lifted_independent_audit_root_20260901.json"
MARKER = "PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G1_MARK_CROSS_EDGE_LIFTED_ROOT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def independent_count(graph: nx.Graph, nodes: set[int], rank: int) -> int:
    return sum(
        all(not graph.has_edge(left, right) for left, right in itertools.combinations(subset, 2))
        for subset in itertools.combinations(sorted(nodes), rank)
    )


def main() -> None:
    catalog = tree_catalog(10)
    minima = {rank: None for rank in range(2, 5)}
    structural_failures = []
    stream = hashlib.sha256()
    cells = 0
    for order in range(8, 11):
        for forest_index, graph in enumerate(nonisomorphic_forests(order, catalog)):
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            for u, v in itertools.combinations(tuple(graph), 2):
                if graph.has_edge(u, v):
                    continue
                h_nodes = set(graph) - {u, v}
                u_set = {node for node in h_nodes if graph.has_edge(v, node)}
                v_set = {node for node in h_nodes if graph.has_edge(u, node)}
                c = len(u_set & v_set)
                union = u_set | v_set
                hx = graph.subgraph(union).number_of_edges()
                if c not in (0, 1) or hx not in (0, 1) or hx > 1 - c:
                    structural_failures.append((order, graph6, u, v, c, hx))
                d = len(union)
                for rank in range(2, 5):
                    actual = independent_count(graph, h_nodes, rank)
                    lower = choose(d, rank) - hx * choose(d - 2, rank - 2)
                    slack = actual - lower
                    minima[rank] = slack if minima[rank] is None else min(minima[rank], slack)
                    if slack < 0:
                        structural_failures.append((order, graph6, u, v, rank, slack))
                    cells += 1
                    stream.update(
                        f"{order}|{forest_index}|{graph6}|{u}|{v}|{c}|{hx}|{rank}|{slack};".encode()
                    )

    passed = not structural_failures
    marker = MARKER if passed else "FAIL_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G1_MARK_CROSS_EDGE_LIFTED_ROOT"
    report = {
        "marker": marker,
        "coverage": "Every nonisomorphic forest of orders 8,9,10 and every nonadjacent marked pair.",
        "proof_rule": (
            "The induced union of the two marked-neighbor sets has exactly HX edges, with "
            "HX in {0,1-c}; its independent r-subsets number C(d,r)-HX*C(d-2,r-2)."
        ),
        "implementation": "Direct graph construction and brute-force independent-subset counting.",
        "cells": cells,
        "minima": minima,
        "structural_failures": structural_failures,
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": marker,
        "cells": cells,
        "minima": minima,
        "structural_failures": len(structural_failures),
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(marker)


if __name__ == "__main__":
    main()
