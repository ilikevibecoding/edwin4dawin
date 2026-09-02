#!/usr/bin/env python3
"""Independent structural and minimum-witness audit of the connected n=8 census.

This does not replay all 542,976 values.  It independently checks the finite
scope counts, class counts, hashes, and reconstructs the reported exact
minimum witness from the literal rank-six g1 evaluator.
"""

from __future__ import annotations

from collections import Counter
import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx

from search_iso_n6_bundle_g1_random_g1_nonadjacent import evaluator, rows


HERE = Path(__file__).resolve().parent
SOURCE = HERE / "census_iso_n6_bundle_g1_leaf_deletion_connected_n8_agent.py"
REPORT = HERE / "iso_n6_bundle_g1_leaf_deletion_connected_n8_exact_agent_20260831.json"
OUTPUT = HERE / "iso_n6_bundle_g1_leaf_deletion_connected_n8_audit_root_20260831.json"
MARKER = "AUDIT_STATIC_AND_MINIMUM_EXACT_ISO_N6_BUNDLE_G1_LEAF_DELETION_CONNECTED_N8_ROOT"
SOURCE_SHA = "31742B607F06EE45720035E477A2E8C8B20783C1AFFBD2C2BB256A08BB40CC52"
REPORT_SHA = "7D471877BF239DABFA818EA4F8F846FAFBD59A4CA77FB697690B52B01B1574D2"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def main() -> None:
    require(sha256(SOURCE) == SOURCE_SHA, "census source hash mismatch")
    require(sha256(REPORT) == REPORT_SHA, "census report hash mismatch")
    report = json.loads(REPORT.read_text(encoding="utf-8"))
    require(report["source_sha256"] == SOURCE_SHA, "embedded source hash mismatch")
    require(report["marker"] == "PASS_EXACT_ISO_N6_BUNDLE_G1_LEAF_DELETION_CONNECTED_N8_AGENT",
            "terminal marker mismatch")
    require(report["signs"] == {"positive": 542976}, "reported signs are not all positive")

    trees = list(nx.nonisomorphic_trees(8))
    marked_pairs = 0
    eligible_leaves = 0
    class_counts = Counter()
    for graph0 in trees:
        graph = nx.convert_node_labels_to_integers(graph0)
        nodes = tuple(graph)
        for u, v in itertools.combinations(nodes, 2):
            marked_pairs += 1
            for leaf in nodes:
                if leaf in (u, v) or graph.degree(leaf) != 1:
                    continue
                eligible_leaves += 1
                parent = next(iter(graph.neighbors(leaf)))
                parent_kind = "mark_parent" if parent in (u, v) else "ordinary_parent"
                for mask in range(1 << 8):
                    leaf_state = "leaf_retained" if mask & (1 << leaf) else "leaf_deleted"
                    parent_state = "parent_retained" if mask & (1 << parent) else "parent_deleted"
                    class_counts[f"{parent_kind}|{leaf_state}|{parent_state}"] += 1

    require(len(trees) == 23, "nonisomorphic tree count mismatch")
    require(marked_pairs == 644, "marked-pair count mismatch")
    require(eligible_leaves == 2121, "eligible-leaf count mismatch")
    require(sum(class_counts.values()) == 542976, "cell count mismatch")
    reported_classes = {
        key: int(value["positive"]) for key, value in report["classes"].items()
    }
    require(dict(sorted(class_counts.items())) == dict(sorted(reported_classes.items())),
            "retention class counts mismatch")

    minimum = tuple(report["minimum"])
    delta, tree_index, code, u, v, mask, leaf, parent, before_expected, after_expected = minimum
    graph = nx.convert_node_labels_to_integers(trees[tree_index])
    require(nx.to_graph6_bytes(graph, header=False).decode().strip() == code,
            "minimum graph6 reconstruction mismatch")
    require(leaf not in (u, v) and graph.degree(leaf) == 1, "minimum leaf is ineligible")
    require(next(iter(graph.neighbors(leaf))) == parent, "minimum parent mismatch")
    retained = {node for node in graph if mask & (1 << node)}
    reduced = graph.copy()
    reduced.remove_node(leaf)
    retained_reduced = retained - {leaf}
    value = evaluator()
    before = value(rows(graph, u, v), rows(graph.subgraph(retained).copy(), u, v))
    after = value(rows(reduced, u, v), rows(reduced.subgraph(retained_reduced).copy(), u, v))
    require((before, after, before - after) == (before_expected, after_expected, delta),
            "minimum witness value reconstruction mismatch")

    audit = {
        "marker": MARKER,
        "census_source_sha256": SOURCE_SHA,
        "census_report_sha256": REPORT_SHA,
        "independent_scope_counts": {
            "nonisomorphic_trees": len(trees),
            "marked_pairs": marked_pairs,
            "eligible_leaf_instances": eligible_leaves,
            "actual_D_leaf_cells": sum(class_counts.values()),
            "classes": dict(sorted(class_counts.items())),
        },
        "minimum_witness_reconstructed": list(minimum),
        "scope_guard": (
            "This audits structure and the exact minimum witness but is not a second full value "
            "replay.  The result remains a connected order-8 bounded sublemma, not a universal "
            "leaf theorem or universal rank-six g1 proof."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(audit, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print("SOURCE_SHA256", audit["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print(MARKER)


if __name__ == "__main__":
    main()
