#!/usr/bin/env python3
"""Exhaustive small-forest falsification census for ordinary-leaf monotonicity."""

from __future__ import annotations

from collections import Counter
import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx

from search_iso_n6_bundle_g1_random_g1_nonadjacent import evaluator, rows


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_ordinary_leaf_deletion_small_census_exact_g1_nonadjacent_20260831.json"
MARKER = "PROBE_EXACT_ISO_N6_BUNDLE_G1_ORDINARY_LEAF_DELETION_SMALL_G1_NONADJACENT"


def main():
    value = evaluator()
    signs = Counter()
    classes = {}
    stream = hashlib.sha256()
    minimum = None
    cells = 0
    for graph0 in nx.graph_atlas_g():
        if not (2 <= len(graph0) <= 7 and nx.is_forest(graph0)):
            continue
        graph = nx.convert_node_labels_to_integers(graph0)
        nodes = tuple(graph)
        code = nx.to_graph6_bytes(graph, header=False).decode().strip()
        for u, v in itertools.combinations(nodes, 2):
            leaves = [node for node in nodes if node not in (u, v) and graph.degree(node) <= 1]
            if not leaves:
                continue
            crows = rows(graph, u, v)
            reduced_by_leaf = {}
            for leaf in leaves:
                reduced = graph.copy()
                reduced.remove_node(leaf)
                reduced_by_leaf[leaf] = (reduced, rows(reduced, u, v))
            for mask in range(1 << len(nodes)):
                retained = {node for index, node in enumerate(nodes) if mask & (1 << index)}
                drows = rows(graph.subgraph(retained).copy(), u, v)
                before = value(crows, drows)
                for leaf in leaves:
                    parent = next(iter(graph.neighbors(leaf)), None)
                    reduced, reduced_crows = reduced_by_leaf[leaf]
                    retained_reduced = retained - {leaf}
                    after = value(
                        reduced_crows,
                        rows(reduced.subgraph(retained_reduced).copy(), u, v),
                    )
                    delta = before - after
                    stream.update(f"{len(nodes)}|{code}|{u}|{v}|{mask}|{leaf}|{delta};".encode())
                    sign = "negative" if delta < 0 else "positive" if delta > 0 else "zero"
                    signs[sign] += 1
                    label = (
                        "isolated" if parent is None else "mark_parent" if parent in (u, v) else "ordinary_parent",
                        "leaf_retained" if leaf in retained else "leaf_deleted",
                        "parent_retained" if parent in retained else "parent_deleted",
                    )
                    classes.setdefault(label, Counter())[sign] += 1
                    record = (delta, len(nodes), code, u, v, mask, leaf, parent, before, after)
                    minimum = record if minimum is None or record < minimum else minimum
                    cells += 1
                    if delta < 0:
                        print("COUNTEREXAMPLE", record)
                        print("CELLS", cells, "SIGNS", dict(signs))
                        return
    print("CELLS", cells)
    print("SIGNS", dict(signs))
    for label in sorted(classes, key=str):
        print("CLASS", label, dict(classes[label]))
    print("MINIMUM", minimum)
    print("ORDERED_STREAM_SHA256", stream.hexdigest().upper())
    report = {
        "marker": MARKER,
        "atlas_orders": [2, 7],
        "leaf_actual_D_cells": cells,
        "signs": dict(signs),
        "classes": {"|".join(label): dict(value) for label, value in sorted(classes.items(), key=lambda item: str(item[0]))},
        "minimum": list(minimum),
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "role": "exhaustive finite falsification only; zero negatives is not a universal theorem",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
