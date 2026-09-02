#!/usr/bin/env python3
"""Independent graph-level audit of the marked-neighborhood constraints."""

from __future__ import annotations

from collections import Counter
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
OUTPUT = HERE / "iso_n6_bundle_g1_mark_neighborhood_constraints_independent_audit_root_20260901.json"
MARKER = "PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G1_MARK_NEIGHBORHOOD_CONSTRAINTS_ROOT"


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
    counts = Counter()
    minima: dict[str, int] = {}
    stream = hashlib.sha256()
    structural_failures = []
    for order in range(8, 11):
        for forest_index, graph in enumerate(nonisomorphic_forests(order, catalog)):
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            for u, v in itertools.combinations(tuple(graph), 2):
                h = set(graph) - {u, v}
                u_set = {node for node in h if graph.has_edge(v, node)}
                v_set = {node for node in h if graph.has_edge(u, node)}
                geometry = "adjacent" if graph.has_edge(u, v) else "nonadjacent"
                union = u_set | v_set
                intersection = u_set & v_set
                union_edges = graph.subgraph(union).number_of_edges()
                facts = [
                    graph.subgraph(u_set).number_of_edges() == 0,
                    graph.subgraph(v_set).number_of_edges() == 0,
                ]
                if geometry == "adjacent":
                    facts.extend((not intersection, union_edges == 0))
                else:
                    facts.extend((len(intersection) <= 1, union_edges <= 1 - len(intersection)))
                if not all(facts):
                    structural_failures.append((order, graph6, u, v, geometry))

                a_nodes = h - u_set
                b_nodes = h - v_set
                z_nodes = h - union
                for rank in range(2, 5):
                    i_w = independent_count(graph, h, rank)
                    i_a = independent_count(graph, a_nodes, rank)
                    i_b = independent_count(graph, b_nodes, rank)
                    checks = []
                    if geometry == "adjacent":
                        checks.extend((
                            ("W_union", i_w - choose(len(union), rank)),
                            ("A_contains_V", i_a - choose(len(v_set), rank)),
                            ("B_contains_U", i_b - choose(len(u_set), rank)),
                        ))
                    else:
                        c = len(intersection)
                        checks.extend((
                            ("W_contains_U", i_w - choose(len(u_set), rank)),
                            ("W_contains_V", i_w - choose(len(v_set), rank)),
                            (
                                "W_union_one_edge",
                                i_w - choose(len(union), rank)
                                + (1 - c) * choose(len(union), rank - 2),
                            ),
                            ("A_contains_V_minus_U", i_a - choose(len(v_set - u_set), rank)),
                            ("B_contains_U_minus_V", i_b - choose(len(u_set - v_set), rank)),
                        ))
                    for name, slack in checks:
                        key = f"{geometry}:{name}:r{rank}"
                        counts[key] += 1
                        minima[key] = slack if key not in minima else min(minima[key], slack)
                        stream.update(
                            f"{order}|{forest_index}|{graph6}|{u}|{v}|{key}|{slack};".encode()
                        )

                # Independently check the coordinate sizes used by the symbolic formulas.
                m = order - 2
                a = len(a_nodes)
                b = len(b_nodes)
                z = len(z_nodes)
                if geometry == "adjacent":
                    size_facts = (len(union) == 2 * m - a - b,)
                else:
                    c = len(intersection)
                    size_facts = (
                        c == m - a - b + z,
                        len(union) == m - z,
                        len(v_set - u_set) == a - z,
                        len(u_set - v_set) == b - z,
                    )
                if not all(size_facts):
                    structural_failures.append((order, graph6, u, v, geometry, "sizes"))

    negative_slacks = {key: value for key, value in minima.items() if value < 0}
    passed = not structural_failures and not negative_slacks
    marker = MARKER if passed else "FAIL_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G1_MARK_NEIGHBORHOOD_CONSTRAINTS_ROOT"
    report = {
        "marker": marker,
        "coverage": "Every nonisomorphic forest of orders 8,9,10 and every unordered marked pair.",
        "implementation": (
            "Direct neighbor-set construction and brute-force independent-subset counting; "
            "does not import the symbolic constraint generator or marked occupation-row code."
        ),
        "structural_failures": structural_failures,
        "negative_slacks": negative_slacks,
        "minima": minima,
        "cells": sum(counts.values()),
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": marker,
        "cells": report["cells"],
        "structural_failures": len(structural_failures),
        "negative_slacks": negative_slacks,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(marker)


if __name__ == "__main__":
    main()
