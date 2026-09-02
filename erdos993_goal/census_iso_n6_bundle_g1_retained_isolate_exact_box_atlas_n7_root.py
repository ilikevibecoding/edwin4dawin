#!/usr/bin/env python3
"""Exact atlas census of the retained-isolate exact box through order seven.

The exact box depends on the induced minor only through the two retained-mark
bits and the number t of retained unmarked vertices.  Thus, for each marked
nonisomorphic forest it suffices to enumerate t=0,...,n-2 and the four mark
bits; this covers every induced minor for the lower-bound theorem.
"""

from __future__ import annotations

from collections import Counter
import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from derive_iso_n6_bundle_g1_retained_isolate_exact_box_root import build
from search_iso_n6_bundle_g1_random_g1_nonadjacent import categories, rows


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_retained_isolate_exact_box_atlas_n7_root_20260901.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G1_RETAINED_ISOLATE_EXACT_BOX_ATLAS_N7_ROOT"
DERIVATION = HERE / "derive_iso_n6_bundle_g1_retained_isolate_exact_box_root.py"
EXPECTED_DERIVATION_SHA256 = "A31600954BF9B8F66F31020383FEE81565F0F467AA4C7550730628394921F043"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    derivation_hash = sha256(DERIVATION)
    if derivation_hash != EXPECTED_DERIVATION_SHA256:
        raise RuntimeError(f"derivation hash mismatch: {derivation_hash}")
    _, dlinear, _, branches = build()
    if not dlinear:
        raise RuntimeError("D-linearity prerequisite failed")
    evaluators = {}
    for label, row in branches.items():
        expression = sp.sympify(row["exact_box_lower_expression"])
        variables = tuple(sorted(expression.free_symbols, key=str))
        evaluators[label] = (variables, sp.lambdify(variables, expression, "math"))

    counts = Counter()
    branch_counts = {label: Counter() for label in branches}
    minimum = None
    witness = None
    forest_count = 0
    marked_count = 0
    stream = hashlib.sha256()
    for atlas_graph in nx.graph_atlas_g():
        if not (2 <= len(atlas_graph) <= 7 and nx.is_forest(atlas_graph)):
            continue
        graph = nx.convert_node_labels_to_integers(atlas_graph)
        forest_count += 1
        order = len(graph)
        graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
        for u, v in itertools.combinations(tuple(graph), 2):
            marked_count += 1
            cvalues = categories(rows(graph, u, v))
            geometry = "adjacent" if graph.has_edge(u, v) else "nonadjacent"
            for uvalue in (0, 1):
                for vvalue in (0, 1):
                    label = f"{geometry}_u{uvalue}_v{vvalue}"
                    variables, evaluate = evaluators[label]
                    for tvalue in range(order - 1):
                        values = {**cvalues, "n": order, "t": tvalue}
                        value = int(evaluate(*(values[str(variable)] for variable in variables)))
                        sign = "negative" if value < 0 else "positive" if value > 0 else "zero"
                        counts[sign] += 1
                        branch_counts[label][sign] += 1
                        record = (value, order, graph6, u, v, uvalue, vvalue, tvalue)
                        if minimum is None or value < minimum:
                            minimum = value
                            witness = record
                        stream.update(
                            f"{order}|{graph6}|{u}|{v}|{uvalue}|{vvalue}|{tvalue}|{value};".encode()
                        )

    if counts["negative"]:
        marker = "FAIL_EXACT_ISO_N6_BUNDLE_G1_RETAINED_ISOLATE_EXACT_BOX_ATLAS_N7_ROOT"
    else:
        marker = MARKER
    report = {
        "marker": marker,
        "orders": [2, 7],
        "nonisomorphic_forests": forest_count,
        "marked_pairs": marked_count,
        "cells": sum(counts.values()),
        "counts": dict(counts),
        "branch_counts": {label: dict(branch_counts[label]) for label in sorted(branch_counts)},
        "minimum": minimum,
        "minimum_witness": list(witness) if witness else None,
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "coverage": (
            "All nonisomorphic forests of orders 2..7, all unordered marked pairs, "
            "all four retained-mark masks, and every feasible unmarked-minor order t."
        ),
        "scope_guard": (
            "This closes the exact-box lower only through order seven. It is not a "
            "universal retained-isolate theorem."
        ),
        "derivation_source_sha256": derivation_hash,
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(marker)


if __name__ == "__main__":
    main()
